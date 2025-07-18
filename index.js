// by zasharan2 yo

// canvas handling
var c = document.getElementById("mainCanvas");
var ctx = c.getContext("2d");

window.addEventListener("resize", (ev) => updateCanvasSize());

function updateCanvasSize() {
    c.width = window.innerWidth;
    c.height = window.innerHeight;
}

var keyBinds = {
    separate: [" "],
    resetOrientation: ["c"],
    scramble: ["s"],
    reset: ["S"],
    lxTurn: ["l", "x"],
    lyTurn: ["l", "y"],
    lzTurn: ["l", "z"],
    rxTurn: ["r", "x"],
    ryTurn: ["r", "y"],
    rzTurn: ["r", "z"],
    ixTurn: ["i", "x"],
    oxTurn: ["o", "x"],
    lxPrimeTurn: ["L", "X"],
    lyPrimeTurn: ["L", "Y"],
    lzPrimeTurn: ["L", "Z"],
    rxPrimeTurn: ["R", "X"],
    ryPrimeTurn: ["R", "Y"],
    rzPrimeTurn: ["R", "Z"],
    ixPrimeTurn: ["I", "X"],
    oxPrimeTurn: ["O", "X"],
    u2Turn: ["u"],
    f2Turn: ["f"],
    d2Turn: ["d"],
    b2Turn: ["b"],
    xTurn: ["x"],
    xPrimeTurn: ["X"],
    y2Turn: ["y"],
    z2Turn: ["z"],
    gyro: ["g"],
    gyroPrime: ["G"]
};

var keys = [];
var runKey = false; // true when keybind can be properly called, but set false when keybind returns true; limits checkKeyBind so doesn't spam true when keyBind satisfied

document.addEventListener("keydown", function (event) {
    keys[event.key] = true;
    runKey = true;
    // if (["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", " ", "Tab"].indexOf(event.key) > -1) {
    //     event.preventDefault();
    // }
});

document.addEventListener("keyup", function (event) {
    keys[event.key] = false;
    runKey = false;
});

function checkKeyBind(keyBind) {
    if (runKey) {
        for (var i = 0; i < keyBind.length; i++) {
            if (!keys[keyBind[i]]) return false;
        }
        runKey = false;
        return true;
    }
    return false;
}

c.addEventListener('contextmenu', function(event) {
    event.preventDefault();
});

var mouseDown, mouseButton;

window.addEventListener("mousedown", function(event) {
    mouseDown = true;
    mouseButton = event.buttons;
});

window.addEventListener("mouseup", function(event) {
    mouseDown = false;
});

document.addEventListener("wheel", function(event) {
    switch (screen) {
        case SCREENTYPE.PUZZLE: {
            if (!scrambling && animating == ANIMATION.NONE) {
                scaleCuboids(puzzle, -event.deltaY * deltaTime * (1 / 10000))
            }
            break;
        }
        case SCREENTYPE.SETTINGS:
        case SCREENTYPE.HELPINFO:
            settingsScroll -= event.deltaY * deltaTime / 3;
            break;
    }
});

var turnSound = new Audio("sounds/turn.mp3");
var orientSound = new Audio("sounds/orient.mp3");
var orient2Sound = new Audio("sounds/orient2.mp3");
var gyroSound = new Audio("sounds/gyro2.mp3");
var solveSound = new Audio("sounds/solve.wav");
var scrambleSound = new Audio("sounds/scramble.mp3");

var vineboomSound = new Audio("sounds/vineboom.mp3");
var boowompSound = new Audio("sounds/boowomp.mp3");
var brainfartSound = new Audio("sounds/brainfart.mp3");
var fartSound = new Audio("sounds/fart.mp3");

function playAudio(audio, affectedBySpeed) {
    var temp = audio.cloneNode(true);
    if (affectedBySpeed) {
        temp.playbackRate = Math.min(16, turnSpeed * 12);
    }
    temp.play();
}

var soundEffectsOn = 1;

class Vector3 {
    // integer arguments
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    // pair with constructor
    copyFrom(other) {
        this.x = other.x;
        this.y = other.y;
        this.z = other.z;
    }

    zero() {
        this.x = 0;
        this.y = 0;
        this.z = 0;
    }

    add(other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }

    mul(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    flip() {
        return this.mul(-1);
    }

    sub(other) {
        return this.add(other.flip());
    }

    div(scalar) {
        return this.mul(1 / scalar);
    }

    dot(other) {
        return (this.x * other.x) + (this.y * other.y) + (this.z * other.z);
    }

    cross(other) {
        return new Vector3((this.y * other.z) - (this.z * other.y), (this.z * other.x) - (this.x * other.z), (this.x * other.y) - (this.y * other.x));
    }

    norm() {
        return Math.sqrt(this.dot(this));
    }

    unit() {
        return this.div(this.norm());
    }

    // alpha, beta, gamma --> x, y, z respectively
    rotateEuler(alpha, beta, gamma) {
        return new Vector3((this.x * Math.cos(beta) * Math.cos(gamma)) + (this.y * ((Math.sin(alpha) * Math.sin(beta) * Math.cos(gamma)) - (Math.cos(alpha) * Math.sin(gamma)))) + (this.z * ((Math.cos(alpha) * Math.sin(beta) * Math.cos(gamma)) + (Math.sin(alpha) * Math.sin(gamma)))), 
                           (this.x * Math.cos(beta) * Math.sin(gamma)) + (this.y * ((Math.sin(alpha) * Math.sin(beta) * Math.sin(gamma)) + (Math.cos(alpha) * Math.cos(gamma)))) + (this.z * ((Math.cos(alpha) * Math.sin(beta) * Math.sin(gamma)) - (Math.sin(alpha) * Math.cos(gamma)))),
                           (this.x * -Math.sin(beta)) + (this.y * Math.sin(alpha) * Math.cos(beta)) + (this.z * Math.cos(alpha) * Math.cos(beta)));
    }

    projection2D(aspectRatio, FOV, zNear, zFar) {
        if (this.z != 0) {
            return new Vector3(aspectRatio * (1 / Math.tan(FOV / 2)) * this.x * (1 / this.z), (1 / Math.tan(FOV / 2)) * this.y * (1 / this.z), ((this.z * (zFar / (zFar - zNear))) - ((zFar * zNear) / (zFar - zNear))) * (1 / this.z));
        } else {
            return new Vector3(aspectRatio * (1 / Math.tan(FOV / 2)) * this.x, (1 / Math.tan(FOV / 2)) * this.y, (this.z * (zFar / (zFar - zNear))) - ((zFar * zNear) / (zFar - zNear)));
        }
    }
}

var mousePos = new Vector3(0, 0, 0);
var mousePrevPos = new Vector3(0, 0, 0);
var mouseDelta = new Vector3(0, 0, 0);
var mouseStop;

var mousePrevTime = Date.now();
var mouseDeltaTime = 0;

window.addEventListener("mousemove", function(event) {
    mouseDeltaTime = Date.now() - mousePrevTime;
    mousePrevTime = Date.now();

    mousePos.x = (event.clientX - c.getBoundingClientRect().left);
    mousePos.y = (event.clientY - c.getBoundingClientRect().top);

    mouseDelta = mousePos.sub(mousePrevPos).mul(0.05).div(mouseDeltaTime);

    mousePrevPos.copyFrom(mousePos);
    
    this.clearTimeout(mouseStop);

    mouseStop = this.setTimeout(function() {
        mouseDelta.zero();
    }, 100);
});

class Triangle {
    constructor(p1, p2, p3, stroke = null, lineWidth = 1, fill = null) {
        this.points = [p1, p2, p3];
        this.projectedPoints = [0, 0, 0];
        this.normal = new Vector3(0, 0, 0);
        this.stroke = stroke;
        this.lineWidth = lineWidth;
        this.fill = fill;
    }

    checkNormal() {
        var newPoints = [];
        for (var i = 0; i < this.points.length; i++) {
            // construct newPoint from this.points[i]
            var newPoint = new Vector3(0, 0, 0);
            newPoint.copyFrom(this.points[i]);

            // offset into the screen
            newPoint.z += 3;

            // push to list
            newPoints.push(newPoint);
        }

        var line1 = newPoints[1].sub(newPoints[0]);
        var line2 = newPoints[2].sub(newPoints[0]);
        var normal = line1.cross(line2).unit();

        if (normal.dot(newPoints[0].sub(camera.pos)) < 0) {
            return [true, normal, newPoints];
        } else {
            return [false, normal, newPoints];
        }
    }

    project() {
        var check = this.checkNormal();

        // check if triangle normal visible
        if (check[0]) {
            var normal = check[1];
            var newPoints = check[2];

            for (var i = 0; i < newPoints.length; i++) {
                var newPoint = newPoints[i];

                // project
                newPoint = newPoint.projection2D(c.height / c.width, FOV, 0.1, 1000);

                // scale
                newPoint = newPoint.add(new Vector3(1, 1, 0));

                newPoint.x *= 0.5 * c.width;
                newPoint.y *= 0.5 * c.height;

                // update list again
                newPoints[i] = newPoint;
            }

            // update self
            this.projectedPoints = newPoints;
            this.normal = normal;
        }
        // don't update self
        this.normal = normal;
    }

    render() {
        if (this.checkNormal()[0]) {
            // draw triangle
            ctx.beginPath();
            ctx.lineJoin = "miter";
            ctx.miterLimit = 1;
            ctx.moveTo(this.projectedPoints[0].x, this.projectedPoints[0].y);
            ctx.lineTo(this.projectedPoints[1].x, this.projectedPoints[1].y);
            ctx.lineTo(this.projectedPoints[2].x, this.projectedPoints[2].y);
            ctx.lineTo(this.projectedPoints[0].x, this.projectedPoints[0].y);
            // stroke
            if (this.stroke != null) {
                ctx.strokeStyle = this.stroke;
                ctx.lineWidth = this.lineWidth;
                ctx.stroke();
            }
            // fill
            if (this.fill != null) {
                ctx.fillStyle = this.fill;
                ctx.fill();
            }

            // shade by lighting
            var lighting = this.normal.dot(lightDir);
            if (this.stroke != null) {
                ctx.strokeStyle = `rgba(0, 0, 0, ${(lighting + 1) / 2})`;
                ctx.lineWidth = this.lineWidth;
                ctx.stroke();
            }
            if (this.fill != null) {
                ctx.fillStyle = `rgba(0, 0, 0, ${(lighting + 1) / 2})`;
                ctx.fill();
            }
        }
    }

    translate(vector) {
        for (var i = 0; i < this.points.length; i++) {
            this.points[i] = this.points[i].add(vector);
        }
    }

    // alpha, beta, gamma --> x, y, z respectively
    rotateEuler(alpha, beta, gamma) {
        for (var i = 0; i < this.points.length; i++) {
            this.points[i] = this.points[i].rotateEuler(alpha, beta, gamma);
        }
    }
}

class Mesh {
    constructor(pos, triangleList) {
        this.pos = pos;
        this.localAxis = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
        this.triangleList = triangleList;
    }

    addTriangle(triangle) {
        this.triangleList.push(triangle);
    }

    addTriangleDoubleSided(triangle) {
        this.triangleList.push(triangle);
        this.triangleList.push(new Triangle(triangle.points[0], triangle.points[2], triangle.points[1], triangle.stroke, triangle.lineWidth, triangle.fill));
    }

    projectTriangles() {
        for (var i = 0; i < this.triangleList.length; i++) {
            this.triangleList[i].project();
        }
    }

    setPosition(vector) {
        this.pos.copyFrom(vector);
    }

    translatePosition(vector) {
        this.pos = this.pos.add(vector);
    }

    translateMesh(vector) {
        for (var i = 0; i < this.triangleList.length; i++) {
            this.triangleList[i].translate(vector);
        }
        // this.pos = this.pos.add(vector);
    }

    translateAll(vector) {
        this.translatePosition(vector);
        this.translateMesh(vector);
    }

    translateLocalMesh(vector) {
        var localX = this.localAxis[0].mul(vector.x);
        var localY = this.localAxis[1].mul(vector.y);
        var localZ = this.localAxis[2].mul(vector.z);
        var sum = localX.add(localY).add(localZ);
        this.translateMesh(sum);
    }

    translateLocalPosition(vector) {
        var localX = this.localAxis[0].mul(vector.x);
        var localY = this.localAxis[1].mul(vector.y);
        var localZ = this.localAxis[2].mul(vector.z);
        var sum = localX.add(localY).add(localZ);
        this.translatePosition(sum);
    }

    resetEuler() {
        // from local axis create rotation matrix (takes vector and rotates it into new axis system)
        // take inverse of matrix (same as transpose for orthogonal axis)
        // convert from matrix to euler angles, extrinsic xyz convention = intrinsic zyx convention
        this.rotateEulerLocal(Math.atan2(this.localAxis[2].y, this.localAxis[2].z), Math.asin(-this.localAxis[2].x), Math.atan2(this.localAxis[1].x, this.localAxis[0].x));
    }

    resetLocalAxis() {
        this.localAxis = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];
    }

    // alpha, beta, gamma --> x, y, z respectively
    // rotation around (0, 0, 0)
    rotateEuler(alpha, beta, gamma) {
        // rotate triangles
        for (var i = 0; i < this.triangleList.length; i++) {
            this.triangleList[i].rotateEuler(alpha, beta, gamma);
        }
        // rotate local axis
        for (var i = 0; i < this.localAxis.length; i++) {
            this.localAxis[i] = this.localAxis[i].rotateEuler(alpha, beta, gamma);
        }
        // rotate position
        // this.pos = this.pos.rotateEuler(alpha, beta, gamma);
    }

    // rotation around pos
    rotateEulerLocal(alpha, beta, gamma) {
        // rotate triangles
        for (var i = 0; i < this.triangleList.length; i++) {
            this.triangleList[i].translate(this.pos.flip());
            this.triangleList[i].rotateEuler(alpha, beta, gamma);
            this.triangleList[i].translate(this.pos);
        }
        // rotate local axis
        for (var i = 0; i < this.localAxis.length; i++) {
            this.localAxis[i] = this.localAxis[i].rotateEuler(alpha, beta, gamma);
        }
    }
}

function renderMeshes(meshList) {
    // project all triangles
    var projectedTriangles = [];
    for (var i = 0; i < meshList.length; i++) {
        meshList[i].projectTriangles();
        projectedTriangles.push(...meshList[i].triangleList);
    }

    // sort all triangles (painter's algorithm)
    projectedTriangles = projectedTriangles.sort((a, b) => ((b.points[0].z + b.points[1].z + b.points[2].z) / 3) - ((a.points[0].z + a.points[1].z + a.points[2].z) / 3))

    // render all triangles
    for (var i = 0; i < projectedTriangles.length; i++) {
        projectedTriangles[i].render();
    }
}

class Camera {
    constructor(pos, dir) {
        this.pos = pos;
        this.dir = dir;
    }
}

var FOV = Math.PI / 4; // 90 degrees
var camera = new Camera(new Vector3(0, 0, 0), new Vector3(0, 0, 1));
var lightDir = new Vector3(0, 0, 1);

class Cuboid {
    constructor(pos, fillColors) {
        this.pos = pos;
        this.fillColors = fillColors;
        this.strokeColor = "#000000ff";
        this.lineWidth = 1;
        this.mesh = this.createMesh(this.pos);
    }

    createMesh(pos) {
        var mesh = new Mesh(pos, []);

        // color 1
        mesh.addTriangle(new Triangle(new Vector3(0, 1, 0), new Vector3(1, 1, 0), new Vector3(1, 0, 0), this.strokeColor, this.lineWidth, this.fillColors[0])); // 321
        mesh.addTriangle(new Triangle(new Vector3(1, 1, 0), new Vector3(1, 1, 1), new Vector3(1, 0, 0), this.strokeColor, this.lineWidth, this.fillColors[0])); // 261
        mesh.addTriangle(new Triangle(new Vector3(1, 1, 1), new Vector3(1, 1, 0), new Vector3(0, 1, 0), this.strokeColor, this.lineWidth, this.fillColors[0])); // 623
        // color 2
        mesh.addTriangle(new Triangle(new Vector3(0, 0, 0), new Vector3(0, 1, 0), new Vector3(1, 0, 0), this.strokeColor, this.lineWidth, this.fillColors[1])); // 031
        mesh.addTriangle(new Triangle(new Vector3(0, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1), this.strokeColor, this.lineWidth, this.fillColors[1])); // 014
        mesh.addTriangle(new Triangle(new Vector3(0, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 0), this.strokeColor, this.lineWidth, this.fillColors[1])); // 043
        // color 3
        mesh.addTriangle(new Triangle(new Vector3(1, 0, 0), new Vector3(1, 1, 1), new Vector3(1, 0, 1), this.strokeColor, this.lineWidth, this.fillColors[2])); // 165
        mesh.addTriangle(new Triangle(new Vector3(0, 0, 1), new Vector3(1, 0, 0), new Vector3(1, 0, 1), this.strokeColor, this.lineWidth, this.fillColors[2])); // 415
        mesh.addTriangle(new Triangle(new Vector3(0, 0, 1), new Vector3(1, 0, 1), new Vector3(1, 1, 1), this.strokeColor, this.lineWidth, this.fillColors[2])); // 456
        // color 4
        mesh.addTriangle(new Triangle(new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(0, 1, 1), this.strokeColor, this.lineWidth, this.fillColors[3])); // 347
        mesh.addTriangle(new Triangle(new Vector3(0, 1, 1), new Vector3(1, 1, 1), new Vector3(0, 1, 0), this.strokeColor, this.lineWidth, this.fillColors[3])); // 763
        mesh.addTriangle(new Triangle(new Vector3(1, 1, 1), new Vector3(0, 1, 1), new Vector3(0, 0, 1), this.strokeColor, this.lineWidth, this.fillColors[3])); // 674

        return mesh;
    }

    localAxisLocalTurn(alpha, beta, gamma) {
        var triangleList = this.mesh.triangleList;
        for (var i = 0; i < triangleList.length; i++) {
            for (var j = 0; j < triangleList[i].points.length; j++) {
                var point = triangleList[i].points[j];
                point = point.sub(this.mesh.pos);
                point = new Vector3(point.x * this.mesh.localAxis[0].x + point.y * this.mesh.localAxis[0].y + point.z * this.mesh.localAxis[0].z,
                                    point.x * this.mesh.localAxis[1].x + point.y * this.mesh.localAxis[1].y + point.z * this.mesh.localAxis[1].z,
                                    point.x * this.mesh.localAxis[2].x + point.y * this.mesh.localAxis[2].y + point.z * this.mesh.localAxis[2].z
                );
                point = point.rotateEuler(alpha, beta, gamma);
                point = new Vector3(point.x * this.mesh.localAxis[0].x + point.y * this.mesh.localAxis[1].x + point.z * this.mesh.localAxis[2].x,
                                    point.x * this.mesh.localAxis[0].y + point.y * this.mesh.localAxis[1].y + point.z * this.mesh.localAxis[2].y,
                                    point.x * this.mesh.localAxis[0].z + point.y * this.mesh.localAxis[1].z + point.z * this.mesh.localAxis[2].z
                );
                point = point.add(this.mesh.pos);
                this.mesh.triangleList[i].points[j] = point;
            }
        }
    }

    getColors() {
        // resetEuler
        var returnList = [];
        for (var i = 0; i < (this.mesh.triangleList.length / 3); i++) {
            var sum = new Vector3(0, 0, 0);
            for (var j = 0; j < 3; j++) {
                var line1 = this.mesh.triangleList[(3 * i) + j].points[1].sub(this.mesh.triangleList[(3 * i) + j].points[0]);
                var line2 = this.mesh.triangleList[(3 * i) + j].points[2].sub(this.mesh.triangleList[(3 * i) + j].points[0]);
                var cross = line1.cross(line2).unit();
                sum = sum.add(cross);
            }
            returnList.push([sum.unit(), this.mesh.triangleList[3 * i].fill]); // add to returnList [vector pointing in direction of corner, fill color]
        }
        return returnList;
    }

    setColor(direction, color) {
        for (var i = 0; i < (this.mesh.triangleList.length / 3); i++) {
            var sum = new Vector3(0, 0, 0);
            for (var j = 0; j < 3; j++) {
                var line1 = this.mesh.triangleList[(3 * i) + j].points[1].sub(this.mesh.triangleList[(3 * i) + j].points[0]);
                var line2 = this.mesh.triangleList[(3 * i) + j].points[2].sub(this.mesh.triangleList[(3 * i) + j].points[0]);
                var cross = line1.cross(line2).unit();
                sum = sum.add(cross);
            }
            sum = sum.unit();

            // unrotate it
            var vec = new Vector3(sum.x * this.mesh.localAxis[0].x + sum.y * this.mesh.localAxis[0].y + sum.z * this.mesh.localAxis[0].z,
                                  sum.x * this.mesh.localAxis[1].x + sum.y * this.mesh.localAxis[1].y + sum.z * this.mesh.localAxis[1].z,
                                  sum.x * this.mesh.localAxis[2].x + sum.y * this.mesh.localAxis[2].y + sum.z * this.mesh.localAxis[2].z);

            if (roundTo(vec.x, 10) == roundTo(direction.unit().x, 10) && roundTo(vec.y, 10) == roundTo(direction.unit().y, 10) && roundTo(vec.z, 10) == roundTo(direction.unit().z, 10)) {
                this.mesh.triangleList[3 * i].fill = color;
                this.mesh.triangleList[(3 * i) + 1].fill = color;
                this.mesh.triangleList[(3 * i) + 2].fill = color;
            }
        }
    }
}

function roundTo(num, decimals) {
    return Math.floor(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

function getCuboidColorFromDirection(cuboidIndex, direction) {
    var dir = direction.unit();
    var colors = puzzle[cuboidIndex].getColors();
    for (var i = 0; i < colors.length; i++) {
        var vec = colors[i][0];
        // unrotate it (?)
        vec = new Vector3(vec.x * puzzle[cuboidIndex].mesh.localAxis[0].x + vec.y * puzzle[cuboidIndex].mesh.localAxis[0].y + vec.z * puzzle[cuboidIndex].mesh.localAxis[0].z,
                          vec.x * puzzle[cuboidIndex].mesh.localAxis[1].x + vec.y * puzzle[cuboidIndex].mesh.localAxis[1].y + vec.z * puzzle[cuboidIndex].mesh.localAxis[1].z,
                          vec.x * puzzle[cuboidIndex].mesh.localAxis[2].x + vec.y * puzzle[cuboidIndex].mesh.localAxis[2].y + vec.z * puzzle[cuboidIndex].mesh.localAxis[2].z);
        // fix rounding errors bruh ._.
        if (roundTo(vec.x, 10) == roundTo(dir.x, 10) && roundTo(vec.y, 10) == roundTo(dir.y, 10) && roundTo(vec.z, 10) == roundTo(dir.z, 10)) {
            return colors[i][1];
        }
    }
    return -1;
}

function setCuboidColorFromDirection(cuboidIndex, direction, color) {
    puzzle[cuboidIndex].setColor(direction, color);
}

function setCuboidAllColors(cuboidIndex, parity, colors) {
    // front top to bottom, then up, then last
    if (parity == 0) {
        setCuboidColorFromDirection(cuboidIndex, new Vector3(1, -1, 1), colorScheme[colors[2]]); // up top right
        setCuboidColorFromDirection(cuboidIndex, new Vector3(-1, -1, -1), colorScheme[colors[0]]); // front top left
        setCuboidColorFromDirection(cuboidIndex, new Vector3(1, 1, -1), colorScheme[colors[1]]); // front bottom right
        setCuboidColorFromDirection(cuboidIndex, new Vector3(-1, 1, 1), colorScheme[colors[3]]); // last
    } else if (parity == 1) {
        setCuboidColorFromDirection(cuboidIndex, new Vector3(1, 1, 1), colorScheme[colors[3]]); // last
        setCuboidColorFromDirection(cuboidIndex, new Vector3(-1, 1, -1), colorScheme[colors[1]]); // front bottom left
        setCuboidColorFromDirection(cuboidIndex, new Vector3(1, -1, -1), colorScheme[colors[0]]); // front top right
        setCuboidColorFromDirection(cuboidIndex, new Vector3(-1, -1, 1), colorScheme[colors[2]]); // up top left
    }
}

var prevHasBeenSolved = false;
var hasBeenSolved = false;
function checkSolved() {
    // check "red" (on default)
    var red = getCuboidColorFromDirection(0, new Vector3(-1, 1, 1));
    var redCheck = false;
    if (getCuboidColorFromDirection(1, new Vector3(-1, -1, 1)) == red && getCuboidColorFromDirection(2, new Vector3(-1, 1, -1)) == red && getCuboidColorFromDirection(3, new Vector3(-1, -1, -1)) == red && getCuboidColorFromDirection(10, new Vector3(1, -1, -1)) == red && getCuboidColorFromDirection(11, new Vector3(1, 1, -1)) == red && getCuboidColorFromDirection(9, new Vector3(1, 1, 1)) == red && getCuboidColorFromDirection(8, new Vector3(1, -1, 1)) == red) {
        redCheck = true;
    }
    var orange = getCuboidColorFromDirection(12, new Vector3(-1, 1, 1));
    var orangeCheck = false;
    if (getCuboidColorFromDirection(13, new Vector3(-1, -1, 1)) == orange && getCuboidColorFromDirection(14, new Vector3(-1, 1, -1)) == orange && getCuboidColorFromDirection(15, new Vector3(-1, -1, -1)) == orange && getCuboidColorFromDirection(6, new Vector3(1, -1, -1)) == orange && getCuboidColorFromDirection(7, new Vector3(1, 1, -1)) == orange && getCuboidColorFromDirection(5, new Vector3(1, 1, 1)) == orange && getCuboidColorFromDirection(4, new Vector3(1, -1, 1)) == orange) {
        orangeCheck = true;
    }
    var green = getCuboidColorFromDirection(2, new Vector3(1, -1, -1));
    var greenCheck = false;
    if (getCuboidColorFromDirection(11, new Vector3(-1, -1, -1)) == green && getCuboidColorFromDirection(3, new Vector3(1, 1, -1)) == green && getCuboidColorFromDirection(10, new Vector3(-1, 1, -1)) == green && getCuboidColorFromDirection(14, new Vector3(1, -1, -1)) == green && getCuboidColorFromDirection(7, new Vector3(-1, -1, -1)) == green && getCuboidColorFromDirection(6, new Vector3(-1, 1, -1)) == green && getCuboidColorFromDirection(15, new Vector3(1, 1, -1)) == green) {
        greenCheck = true;
    }
    var blue = getCuboidColorFromDirection(0, new Vector3(1, -1, 1));
    var blueCheck = false;
    if (getCuboidColorFromDirection(9, new Vector3(-1, -1, 1)) == blue && getCuboidColorFromDirection(1, new Vector3(1, 1, 1)) == blue && getCuboidColorFromDirection(8, new Vector3(-1, 1, 1)) == blue && getCuboidColorFromDirection(12, new Vector3(1, -1, 1)) == blue && getCuboidColorFromDirection(5, new Vector3(-1, -1, 1)) == blue && getCuboidColorFromDirection(4, new Vector3(-1, 1, 1)) == blue && getCuboidColorFromDirection(13, new Vector3(1, 1, 1)) == blue) {
        blueCheck = true;
    }
    var white = getCuboidColorFromDirection(3, new Vector3(1, -1, 1));
    var whiteCheck = false;
    if (getCuboidColorFromDirection(10, new Vector3(-1, -1, 1)) == white && getCuboidColorFromDirection(1, new Vector3(1, -1, -1)) == white && getCuboidColorFromDirection(8, new Vector3(-1, -1, -1)) == white && getCuboidColorFromDirection(15, new Vector3(1, -1, 1)) == white && getCuboidColorFromDirection(6, new Vector3(-1, -1, 1)) == white && getCuboidColorFromDirection(13, new Vector3(1, -1, -1)) == white && getCuboidColorFromDirection(4, new Vector3(-1, -1, -1)) == white) {
        whiteCheck = true;
    }
    var yellow = getCuboidColorFromDirection(2, new Vector3(1, 1, 1));
    var yellowCheck = false;
    if (getCuboidColorFromDirection(11, new Vector3(-1, 1, 1)) == yellow && getCuboidColorFromDirection(0, new Vector3(1, 1, -1)) == yellow && getCuboidColorFromDirection(9, new Vector3(-1, 1, -1)) == yellow && getCuboidColorFromDirection(14, new Vector3(1, 1, 1)) == yellow && getCuboidColorFromDirection(7, new Vector3(-1, 1, 1)) == yellow && getCuboidColorFromDirection(12, new Vector3(1, 1, -1)) == yellow && getCuboidColorFromDirection(5, new Vector3(-1, 1, -1)) == yellow) {
        yellowCheck = true;
    }
    var pink = getCuboidColorFromDirection(10, new Vector3(1, 1, 1));
    var pinkCheck = false;
    if (getCuboidColorFromDirection(11, new Vector3(1, -1, 1)) == pink && getCuboidColorFromDirection(8, new Vector3(1, 1, -1)) == pink && getCuboidColorFromDirection(9, new Vector3(1, -1, -1)) == pink && getCuboidColorFromDirection(14, new Vector3(-1, -1, 1)) == pink && getCuboidColorFromDirection(15, new Vector3(-1, 1, 1)) == pink && getCuboidColorFromDirection(12, new Vector3(-1, -1, -1)) == pink && getCuboidColorFromDirection(13, new Vector3(-1, 1, -1)) == pink) {
        pinkCheck = true;
    }
    var purple = getCuboidColorFromDirection(3, new Vector3(-1, 1, 1));
    var purpleCheck = false;
    if (getCuboidColorFromDirection(2, new Vector3(-1, -1, 1)) == purple && getCuboidColorFromDirection(1, new Vector3(-1, 1, -1)) == purple && getCuboidColorFromDirection(0, new Vector3(-1, -1, -1)) == purple && getCuboidColorFromDirection(7, new Vector3(1, -1, 1)) == purple && getCuboidColorFromDirection(6, new Vector3(1, 1, 1)) == purple && getCuboidColorFromDirection(5, new Vector3(1, -1, -1)) == purple && getCuboidColorFromDirection(4, new Vector3(1, 1, -1)) == purple) {
        purpleCheck = true;
    }

    // do opposites check (red opp orange, yellow opp white, etc.)
    function checkOpposites(col1, col2) {
        if (colorScheme.indexOf(col1) % 2 == 0) {
            if (colorScheme.indexOf(col2) != colorScheme.indexOf(col1) + 1) {
                return false;
            }
        } else {
            if (colorScheme.indexOf(col2) != colorScheme.indexOf(col1) - 1) {
                return false;
            }
        }
        return true;
    }

    if (redCheck && orangeCheck && greenCheck && blueCheck && whiteCheck && yellowCheck && pinkCheck && purpleCheck && checkOpposites(red, orange) && checkOpposites(white, yellow) && checkOpposites(blue, green) && checkOpposites(pink, purple)) {
        return true;
    }
    return false;
}

// white yellow red orange green blue pink purple
var colorScheme = ["#ffffffff", "#ffff00ff", "#ff0000ff", "#ff8000ff", "#00ff00ff", "#0080ffff", "#ff00ffff", "#651a97ff"];

function updateColorScheme(newColors) {
    for (var i = 0; i < puzzle.length; i++) {
        for (var j = 0; j < puzzle[i].fillColors.length; j++) {
            puzzle[i].fillColors[j] = newColors[colorScheme.indexOf(puzzle[i].fillColors[j])];
        }
        for (var j = 0; j < puzzle[i].mesh.triangleList.length; j++) {
            puzzle[i].mesh.triangleList[j].fill = newColors[colorScheme.indexOf(puzzle[i].mesh.triangleList[j].fill)];
        }
    }
    colorScheme = [...newColors];
}

// puzzle init
function create2to4(pos) {
    // var cuboidList = [new Cuboid(pos, ["#ffff00ff", "#ff0000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(pos, ["#0080ffff", "#ff0000ff", "#ffffffff", "#ff00ffff"]), new Cuboid(pos, ["#ff00ffff", "#ff0000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(pos, ["#00ff00ff", "#ff0000ff", "#ff00ffff", "#ffffffff"]), new Cuboid(pos, ["#ffffffff", "#ff0000ff", "#0080ffff", "#651a97ff"]), new Cuboid(pos, ["#0080ffff", "#ff0000ff", "#ffff00ff", "#651a97ff"]), new Cuboid(pos, ["#651a97ff", "#ff0000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(pos, ["#00ff00ff", "#ff0000ff", "#651a97ff", "#ffff00ff"]), new Cuboid(pos, ["#ffffffff", "#ff8000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(pos, ["#0080ffff", "#ff8000ff", "#ffff00ff", "#ff00ffff"]), new Cuboid(pos, ["#ff00ffff", "#ff8000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(pos, ["#00ff00ff", "#ff8000ff", "#ff00ffff", "#ffff00ff"]), new Cuboid(pos, ["#ffff00ff", "#ff8000ff", "#0080ffff", "#651a97ff"]), new Cuboid(pos, ["#0080ffff", "#ff8000ff", "#ffffffff", "#651a97ff"]), new Cuboid(pos, ["#651a97ff", "#ff8000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(pos, ["#00ff00ff", "#ff8000ff", "#651a97ff", "#ffffffff"])];
    // var cuboidList = [new Cuboid(new Vector3(0, 0, 0), ["#ffff00ff", "#ff0000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(new Vector3(0, 0, 0), ["#0080ffff", "#ff0000ff", "#ffffffff", "#ff00ffff"]), new Cuboid(new Vector3(0, 0, 0), ["#ff00ffff", "#ff0000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(new Vector3(0, 0, 0), ["#00ff00ff", "#ff0000ff", "#ff00ffff", "#ffffffff"]), new Cuboid(new Vector3(0, 0, 0), ["#ffffffff", "#ff0000ff", "#0080ffff", "#651a97ff"]), new Cuboid(new Vector3(0, 0, 0), ["#0080ffff", "#ff0000ff", "#ffff00ff", "#651a97ff"]), new Cuboid(new Vector3(0, 0, 0), ["#651a97ff", "#ff0000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(new Vector3(0, 0, 0), ["#00ff00ff", "#ff0000ff", "#651a97ff", "#ffff00ff"]), new Cuboid(new Vector3(0, 0, 0), ["#ffffffff", "#ff8000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(new Vector3(0, 0, 0), ["#0080ffff", "#ff8000ff", "#ffff00ff", "#ff00ffff"]), new Cuboid(new Vector3(0, 0, 0), ["#ff00ffff", "#ff8000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(new Vector3(0, 0, 0), ["#00ff00ff", "#ff8000ff", "#ff00ffff", "#ffff00ff"]), new Cuboid(new Vector3(0, 0, 0), ["#ffff00ff", "#ff8000ff", "#0080ffff", "#651a97ff"]), new Cuboid(new Vector3(0, 0, 0), ["#0080ffff", "#ff8000ff", "#ffffffff", "#651a97ff"]), new Cuboid(new Vector3(0, 0, 0), ["#651a97ff", "#ff8000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(new Vector3(0, 0, 0), ["#00ff00ff", "#ff8000ff", "#651a97ff", "#ffffffff"])];
    var cuboidList = [new Cuboid(new Vector3(0, 0, 0), [colorScheme[1], colorScheme[7], colorScheme[5], colorScheme[2]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[5], colorScheme[7], colorScheme[0], colorScheme[2]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[2], colorScheme[7], colorScheme[4], colorScheme[1]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[4], colorScheme[7], colorScheme[2], colorScheme[0]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[0], colorScheme[7], colorScheme[5], colorScheme[3]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[5], colorScheme[7], colorScheme[1], colorScheme[3]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[3], colorScheme[7], colorScheme[4], colorScheme[0]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[4], colorScheme[7], colorScheme[3], colorScheme[1]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[0], colorScheme[6], colorScheme[5], colorScheme[2]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[5], colorScheme[6], colorScheme[1], colorScheme[2]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[2], colorScheme[6], colorScheme[4], colorScheme[0]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[4], colorScheme[6], colorScheme[2], colorScheme[1]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[1], colorScheme[6], colorScheme[5], colorScheme[3]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[5], colorScheme[6], colorScheme[0], colorScheme[3]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[3], colorScheme[6], colorScheme[4], colorScheme[1]]), new Cuboid(new Vector3(0, 0, 0), [colorScheme[4], colorScheme[6], colorScheme[3], colorScheme[0]])];
    // var cuboidList = [new Cuboid(["#ffff00ff", "#ff0000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(["#0080ffff", "#ff0000ff", "#ffffffff", "#ff00ffff"]), new Cuboid(["#ff00ffff", "#ff0000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(["#00ff00ff", "#ff0000ff", "#ff00ffff", "#ffffffff"]), new Cuboid(["#ffffffff", "#ff0000ff", "#0080ffff", "#651a97ff"]), new Cuboid(["#0080ffff", "#ff0000ff", "#ffff00ff", "#651a97ff"]), new Cuboid(["#651a97ff", "#ff0000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(["#00ff00ff", "#ff0000ff", "#651a97ff", "#ffff00ff"]), new Cuboid(["#ffffffff", "#ff8000ff", "#0080ffff", "#ff00ffff"]), new Cuboid(["#0080ffff", "#ff8000ff", "#ffff00ff", "#ff00ffff"]), new Cuboid(["#ff00ffff", "#ff8000ff", "#00ff00ff", "#ffffffff"]), new Cuboid(["#00ff00ff", "#ff8000ff", "#ff00ffff", "#ffff00ff"]), new Cuboid(["#ffff00ff", "#ff8000ff", "#0080ffff", "#651a97ff"]), new Cuboid(["#0080ffff", "#ff8000ff", "#ffffffff", "#651a97ff"]), new Cuboid(["#651a97ff", "#ff8000ff", "#00ff00ff", "#ffff00ff"]), new Cuboid(["#00ff00ff", "#ff8000ff", "#651a97ff", "#ffffffff"])];

    cuboidList[1].mesh.rotateEulerLocal(Math.PI / 2, 0, 0);
    cuboidList[2].mesh.rotateEulerLocal(0, Math.PI / 2, 0);
    cuboidList[3].mesh.rotateEulerLocal(Math.PI / 2, Math.PI / 2, 0);

    cuboidList[4].mesh.rotateEulerLocal(0, 0, Math.PI);
    cuboidList[5].mesh.rotateEulerLocal(Math.PI / 2, 0, Math.PI);
    cuboidList[6].mesh.rotateEulerLocal(0, Math.PI / 2, Math.PI);
    cuboidList[7].mesh.rotateEulerLocal(Math.PI / 2, Math.PI / 2, Math.PI);

    cuboidList[8].mesh.rotateEulerLocal(0, 0, Math.PI);
    cuboidList[9].mesh.rotateEulerLocal(Math.PI / 2, 0, Math.PI);
    cuboidList[10].mesh.rotateEulerLocal(0, Math.PI / 2, Math.PI);
    cuboidList[11].mesh.rotateEulerLocal(Math.PI / 2, Math.PI / 2, Math.PI);

    for (var i = 8; i < 12; i++) {
        cuboidList[i].mesh.translateMesh(new Vector3(2, 0, 0));
    }

    cuboidList[12].mesh.rotateEulerLocal(0, 0, 0);
    cuboidList[13].mesh.rotateEulerLocal(Math.PI / 2, 0, 0);
    cuboidList[14].mesh.rotateEulerLocal(0, Math.PI / 2, 0);
    cuboidList[15].mesh.rotateEulerLocal(Math.PI / 2, Math.PI / 2, 0);

    for (var i = 12; i < 16; i++) {
        cuboidList[i].mesh.translateMesh(new Vector3(-2, 0, 0));
    }

    for (var i = 0; i < 16; i++) {
        cuboidList[i].mesh.translateAll(pos);
        cuboidList[i].mesh.resetLocalAxis();
    }

    return cuboidList;
}

const ANIMATION = {
    NONE: 0,
    SEPARATE: 1,
    TURN: 2,
    WAIT_SUCCESSIVE_ANIM: 3
}

// separation code
// toggle separate, reset anim progress
var separated = false;
var animating = ANIMATION.NONE;
var animationProgress = 0;
var animationIncrement = 0;
function toggleSeparate() {
    animationProgress = 0;
    animationIncrement = 0;
    animating = ANIMATION.SEPARATE;
    separated = !separated;
    playAudio(orientSound, false);
}

// slowly animate smoothly
var separateSpeed = 1 / 5;
function animateSeparation(puzzle) {
    animationIncrement = ((1 - animationProgress) * separateSpeed) * deltaTime;
    animationProgress += animationIncrement;
    if (separated) {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
        }
    } else {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
        }
    }
}

// stick animation when close enough (to prevent next anim starting when prev not yet done)
function stickSeparation(puzzle) {
    animationIncrement = (1 - animationProgress);
    animationProgress += animationIncrement;
    if (separated) {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
        }
    } else {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1 * animationIncrement, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1 * animationIncrement, 0, 0));
        }
    }
}

var scaleDistance = 0;
var scaleDistanceMax = 0.35;
function scaleCuboids(puzzle, factor) {
    if (scaleDistance + factor <= 0) {
        factor = -scaleDistance;
    }
    if (scaleDistance + factor >= scaleDistanceMax) {
        factor = scaleDistanceMax - scaleDistance;
    }

    scaleDistance += factor;

    puzzle[0].mesh.translateLocalMesh(new Vector3(factor, factor, factor));
    puzzle[1].mesh.translateLocalMesh(new Vector3(factor, -factor, factor));
    puzzle[2].mesh.translateLocalMesh(new Vector3(factor, factor, -factor));
    puzzle[3].mesh.translateLocalMesh(new Vector3(factor, -factor, -factor));

    puzzle[4].mesh.translateLocalMesh(new Vector3(-factor, -factor, factor));
    puzzle[5].mesh.translateLocalMesh(new Vector3(-factor, factor, factor));
    puzzle[6].mesh.translateLocalMesh(new Vector3(-factor, -factor, -factor));
    puzzle[7].mesh.translateLocalMesh(new Vector3(-factor, factor, -factor));

    puzzle[8].mesh.translateLocalMesh(new Vector3(3 * factor, -factor, factor));
    puzzle[9].mesh.translateLocalMesh(new Vector3(3 * factor, factor, factor));
    puzzle[10].mesh.translateLocalMesh(new Vector3(3 * factor, -factor, -factor));
    puzzle[11].mesh.translateLocalMesh(new Vector3(3 * factor, factor, -factor));

    puzzle[12].mesh.translateLocalMesh(new Vector3(-3 * factor, factor, factor));
    puzzle[13].mesh.translateLocalMesh(new Vector3(-3 * factor, -factor, factor));
    puzzle[14].mesh.translateLocalMesh(new Vector3(-3 * factor, factor, -factor));
    puzzle[15].mesh.translateLocalMesh(new Vector3(-3 * factor, -factor, -factor));
}

function createReferenceAxisMesh(axisLength, axisWidth) {
    var obj = new Mesh(new Vector3(0, 0, 0), []);
    obj.setPosition(new Vector3(axisWidth / 2, -axisWidth / 2, axisWidth / 2));

    function generateXAxis(obj, col) {
        // x axis
        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, 0), new Vector3(axisLength, 0, 0), new Vector3(axisLength, -axisWidth, 0), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, 0), new Vector3(axisLength, -axisWidth, 0), new Vector3(axisWidth, -axisWidth, 0), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, -axisWidth, 0), new Vector3(axisLength, -axisWidth, 0), new Vector3(axisLength, -axisWidth, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, -axisWidth, 0), new Vector3(axisLength, -axisWidth, axisWidth), new Vector3(axisWidth, -axisWidth, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, -axisWidth, axisWidth), new Vector3(axisLength, -axisWidth, axisWidth), new Vector3(axisLength, 0, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, -axisWidth, axisWidth), new Vector3(axisLength, 0, axisWidth), new Vector3(axisWidth, 0, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, 0), new Vector3(axisWidth, 0, axisWidth), new Vector3(axisLength, 0, 0), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, axisWidth), new Vector3(axisLength, 0, axisWidth), new Vector3(axisLength, 0, 0), null, 0, col));

        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, 0), new Vector3(axisWidth, -axisWidth, 0), new Vector3(axisWidth, 0, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisWidth, 0, axisWidth), new Vector3(axisWidth, -axisWidth, 0), new Vector3(axisWidth, -axisWidth, axisWidth), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisLength, 0, 0), new Vector3(axisLength, 0, axisWidth), new Vector3(axisLength, -axisWidth, 0), null, 0, col));
        obj.addTriangle(new Triangle(new Vector3(axisLength, 0, axisWidth), new Vector3(axisLength, -axisWidth, axisWidth), new Vector3(axisLength, -axisWidth, 0), null, 0, col));
    }

    generateXAxis(obj, "#00ffffff");

    // turn x to z
    obj.rotateEulerLocal(0, -Math.PI / 2, 0);

    generateXAxis(obj, "#008000ff");

    // turn x to y
    obj.rotateEulerLocal(0, 0, -Math.PI / 2);

    generateXAxis(obj, "#ff0000ff");

    // bounding sphere
    var segments = 10;
    var points = [];
    for (var i = 0; i <= segments; i++) {
        const theta = i * Math.PI / segments;

        for (var j = 0; j <= segments; j++) {
            const phi = j * 2 * Math.PI / segments;

            const x = axisLength * Math.sin(theta) * Math.cos(phi);
            const y = axisLength * Math.sin(theta) * Math.sin(phi);
            const z = axisLength * Math.cos(theta);

            points.push(new Vector3(x, y, z));
        }
    }
    for (var i = 0; i < segments; i++) {
        for (var j = 0; j < segments; j++) {
            const a = i * (segments + 1) + j;
            const b = a + 1;
            const c = a + (segments + 1);
            const d = c + 1;

            obj.addTriangle(new Triangle(points[a], points[c], points[b], null, 0, "#ffffff40"));
        }
    }

    obj.resetLocalAxis();

    return obj;
}

function updatePuzzleDistance() {
    if (puzzleSolverDistance != prevPuzzleSolverDistance) {
        for (var i = 0; i < 16; i++) {
            puzzle[i].mesh.translateAll(new Vector3(0, 0, puzzleSolverDistance - prevPuzzleSolverDistance));
        }
        prevPuzzleSolverDistance = puzzleSolverDistance;
    }
}

var puzzleSolverDistance = 5;
var prevPuzzleSolverDistance = puzzleSolverDistance;
var puzzle = create2to4(new Vector3(0, 0, puzzleSolverDistance));
var referenceAxisMesh = createReferenceAxisMesh(0.25, 0.02);
// referenceAxisMesh.translateAll(new Vector3(-3, 2, 0));

function getObjectMeshes(puzzle) {
    var meshList = [];
    for (var i = 0; i < puzzle.length; i++) {
        meshList.push(puzzle[i].mesh);
    }
    return meshList;
}

var turnType = null;
var instantGyros = false;
var instantGyroTimer = 0;
var instantGyroDelay = 30;
var speedList = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 4, 5];
var turnSpeedIndex = speedList.indexOf(1.25);
var turnSpeed = speedList[turnSpeedIndex] / 15;
var angleIncrement = 0;
function determineTurnIncrement(stick) {
    if (stick) {
        animationIncrement = (1 - animationProgress);
        angleIncrement = animationIncrement * Math.PI / 2;
        animationProgress += animationIncrement;
    } else {
        animationIncrement = ((1 - animationProgress) * turnSpeed) * deltaTime;
        angleIncrement = animationIncrement * Math.PI / 2;
        animationProgress += animationIncrement;
    }
}

var prevScaleDistance = 0;
function animateTurn(puzzle, stick) {
    determineTurnIncrement(stick);

    var separateBeforeTurn = (separated && (turnType != "u2" && turnType != "f2" && turnType != "d2" && turnType != "b2" && turnType != "y2" && turnType != "z2" && turnType != "gyroA" && turnType != "gyropA"))

    // unseparate before turn
    if (separateBeforeTurn) {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1, 0, 0));
        }
    }

    switch (turnType) {
        case "lx": {
            for (var i = 4; i < 8; i++) {
                puzzle[i].localAxisLocalTurn(-angleIncrement, 0, 0);
                puzzle[i + 8].localAxisLocalTurn(-angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[2];
                puzzle[5] = prev[0];
                puzzle[6] = prev[3];
                puzzle[7] = prev[1];
                puzzle[12] = prev[5];
                puzzle[13] = prev[7];
                puzzle[14] = prev[4];
                puzzle[15] = prev[6];
            }
            break;
        }
        case "ly": {
            for (var i = 4; i < 8; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));

                puzzle[i].localAxisLocalTurn(0, angleIncrement, 0);
                puzzle[i + 8].localAxisLocalTurn(0, angleIncrement, 0);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[5];
                puzzle[5] = prev[4];
                puzzle[6] = prev[0];
                puzzle[7] = prev[1];
                puzzle[12] = prev[6];
                puzzle[13] = prev[7];
                puzzle[14] = prev[3];
                puzzle[15] = prev[2];
            }
            break;
        }
        case "lz": {
            for (var i = 4; i < 8; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));

                puzzle[i].localAxisLocalTurn(0, 0, angleIncrement);
                puzzle[i + 8].localAxisLocalTurn(0, 0, angleIncrement);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[5];
                puzzle[5] = prev[0];
                puzzle[6] = prev[7];
                puzzle[7] = prev[2];
                puzzle[12] = prev[1];
                puzzle[13] = prev[4];
                puzzle[14] = prev[3];
                puzzle[15] = prev[6];
            }
            break;
        }
        case "rx": {
            for (var i = 0; i < 4; i++) {
                puzzle[i].localAxisLocalTurn(-angleIncrement, 0, 0);
                puzzle[i + 8].localAxisLocalTurn(-angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[1];
                puzzle[1] = prev[3];
                puzzle[2] = prev[0];
                puzzle[3] = prev[2];
                puzzle[8] = prev[6];
                puzzle[9] = prev[4];
                puzzle[10] = prev[7];
                puzzle[11] = prev[5];
            }
            break;
        }
        case "ry": {
            for (var i = 0; i < 4; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));

                puzzle[i].localAxisLocalTurn(0, angleIncrement, 0);
                puzzle[i + 8].localAxisLocalTurn(0, angleIncrement, 0);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[3];
                puzzle[2] = prev[7];
                puzzle[3] = prev[6];
                puzzle[8] = prev[1];
                puzzle[9] = prev[0];
                puzzle[10] = prev[4];
                puzzle[11] = prev[5];
            }
            break;
        }
        case "rz": {
            for (var i = 0; i < 4; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));

                puzzle[i].localAxisLocalTurn(0, 0, angleIncrement);
                puzzle[i + 8].localAxisLocalTurn(0, 0, angleIncrement);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[5];
                puzzle[1] = prev[0];
                puzzle[2] = prev[7];
                puzzle[3] = prev[2];
                puzzle[8] = prev[1];
                puzzle[9] = prev[4];
                puzzle[10] = prev[3];
                puzzle[11] = prev[6];
            }
            break;
        }
        case "ix": {
            for (var i = 0; i < 8; i++) {
                puzzle[i].localAxisLocalTurn(-angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[4], puzzle[5], puzzle[6], puzzle[7]];
                puzzle[0] = prev[1];
                puzzle[1] = prev[3];
                puzzle[2] = prev[0];
                puzzle[3] = prev[2];
                puzzle[4] = prev[6];
                puzzle[5] = prev[4];
                puzzle[6] = prev[7];
                puzzle[7] = prev[5];
            }
            break;
        }
        case "ox": {
            for (var i = 8; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(-angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[8], puzzle[9], puzzle[10], puzzle[11], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[8] = prev[2];
                puzzle[9] = prev[0];
                puzzle[10] = prev[3];
                puzzle[11] = prev[1];
                puzzle[12] = prev[5];
                puzzle[13] = prev[7];
                puzzle[14] = prev[4];
                puzzle[15] = prev[6];
            }
            break;
        }
        case "lxp": {
            for (var i = 4; i < 8; i++) {
                puzzle[i].localAxisLocalTurn(angleIncrement, 0, 0);
                puzzle[i + 8].localAxisLocalTurn(angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[1];
                puzzle[5] = prev[3];
                puzzle[6] = prev[0];
                puzzle[7] = prev[2];
                puzzle[12] = prev[6];
                puzzle[13] = prev[4];
                puzzle[14] = prev[7];
                puzzle[15] = prev[5];
            }
            break;
        }
        case "lyp": {
            for (var i = 4; i < 8; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));

                puzzle[i].localAxisLocalTurn(0, -angleIncrement, 0);
                puzzle[i + 8].localAxisLocalTurn(0, -angleIncrement, 0);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[2];
                puzzle[5] = prev[3];
                puzzle[6] = prev[7];
                puzzle[7] = prev[6];
                puzzle[12] = prev[1];
                puzzle[13] = prev[0];
                puzzle[14] = prev[4];
                puzzle[15] = prev[5];
            }
            break;
        }
        case "lzp": {
            for (var i = 4; i < 8; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));

                puzzle[i].localAxisLocalTurn(0, 0, -angleIncrement);
                puzzle[i + 8].localAxisLocalTurn(0, 0, -angleIncrement);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[1];
                puzzle[5] = prev[4];
                puzzle[6] = prev[3];
                puzzle[7] = prev[6];
                puzzle[12] = prev[5];
                puzzle[13] = prev[0];
                puzzle[14] = prev[7];
                puzzle[15] = prev[2];
            }
            break;
        }
        case "rxp": {
            for (var i = 0; i < 4; i++) {
                puzzle[i].localAxisLocalTurn(angleIncrement, 0, 0);
                puzzle[i + 8].localAxisLocalTurn(angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[0];
                puzzle[2] = prev[3];
                puzzle[3] = prev[1];
                puzzle[8] = prev[5];
                puzzle[9] = prev[7];
                puzzle[10] = prev[4];
                puzzle[11] = prev[6];
            }
            break;
        }
        case "ryp": {
            for (var i = 0; i < 4; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));

                puzzle[i].localAxisLocalTurn(0, -angleIncrement, 0);
                puzzle[i + 8].localAxisLocalTurn(0, -angleIncrement, 0);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[5];
                puzzle[1] = prev[4];
                puzzle[2] = prev[0];
                puzzle[3] = prev[1];
                puzzle[8] = prev[6];
                puzzle[9] = prev[7];
                puzzle[10] = prev[3];
                puzzle[11] = prev[2];
            }
            break;
        }
        case "rzp": {
            for (var i = 0; i < 4; i++) {
                // move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(1 + (2*scaleDistance), 0, 0));

                puzzle[i].localAxisLocalTurn(0, 0, -angleIncrement);
                puzzle[i + 8].localAxisLocalTurn(0, 0, -angleIncrement);

                // undo move position (and thus rotation axis)
                puzzle[i].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
                puzzle[i + 8].mesh.translateLocalPosition(new Vector3(-(1 + (2*scaleDistance)), 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[1];
                puzzle[1] = prev[4];
                puzzle[2] = prev[3];
                puzzle[3] = prev[6];
                puzzle[8] = prev[5];
                puzzle[9] = prev[0];
                puzzle[10] = prev[7];
                puzzle[11] = prev[2];
            }
            break;
        }
        case "ixp": {
            for (var i = 0; i < 8; i++) {
                puzzle[i].localAxisLocalTurn(angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[4], puzzle[5], puzzle[6], puzzle[7]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[0];
                puzzle[2] = prev[3];
                puzzle[3] = prev[1];
                puzzle[4] = prev[5];
                puzzle[5] = prev[7];
                puzzle[6] = prev[4];
                puzzle[7] = prev[6];
            }
            break;
        }
        case "oxp": {
            for (var i = 8; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[8], puzzle[9], puzzle[10], puzzle[11], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[8] = prev[1];
                puzzle[9] = prev[3];
                puzzle[10] = prev[0];
                puzzle[11] = prev[2];
                puzzle[12] = prev[6];
                puzzle[13] = prev[4];
                puzzle[14] = prev[7];
                puzzle[15] = prev[5];
            }
            break;
        }
        case "u2": {
            puzzle[1].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[3].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[4].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[6].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[8].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[10].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[13].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[15].localAxisLocalTurn(0, 2*angleIncrement, 0);

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[1], puzzle[3], puzzle[4], puzzle[6], puzzle[8], puzzle[10], puzzle[13], puzzle[15]];
                puzzle[1] = prev[3];
                puzzle[3] = prev[2];
                puzzle[4] = prev[1];
                puzzle[6] = prev[0];
                puzzle[8] = prev[7];
                puzzle[10] = prev[6];
                puzzle[13] = prev[5];
                puzzle[15] = prev[4];
            }
            break;
        }
        case "f2": {
            puzzle[2].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[3].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[6].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[7].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[10].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[11].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[14].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[15].localAxisLocalTurn(0, 0, 2*angleIncrement);

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[2], puzzle[3], puzzle[6], puzzle[7], puzzle[10], puzzle[11], puzzle[14], puzzle[15]];
                puzzle[2] = prev[2];
                puzzle[3] = prev[3];
                puzzle[6] = prev[0];
                puzzle[7] = prev[1];
                puzzle[10] = prev[6];
                puzzle[11] = prev[7];
                puzzle[14] = prev[4];
                puzzle[15] = prev[5];
            }
            break;
        }
        case "b2": {
            puzzle[0].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[1].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[4].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[5].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[8].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[9].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[12].localAxisLocalTurn(0, 0, 2*angleIncrement);
            puzzle[13].localAxisLocalTurn(0, 0, 2*angleIncrement);

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[4], puzzle[5], puzzle[8], puzzle[9], puzzle[12], puzzle[13]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[3];
                puzzle[4] = prev[0];
                puzzle[5] = prev[1];
                puzzle[8] = prev[6];
                puzzle[9] = prev[7];
                puzzle[12] = prev[4];
                puzzle[13] = prev[5];
            }
            break;
        }
        case "d2": {
            puzzle[0].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[2].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[5].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[7].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[9].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[11].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[12].localAxisLocalTurn(0, 2*angleIncrement, 0);
            puzzle[14].localAxisLocalTurn(0, 2*angleIncrement, 0);

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[2], puzzle[5], puzzle[7], puzzle[9], puzzle[11], puzzle[12], puzzle[14]];
                puzzle[0] = prev[3];
                puzzle[2] = prev[2];
                puzzle[5] = prev[1];
                puzzle[7] = prev[0];
                puzzle[9] = prev[7];
                puzzle[11] = prev[6];
                puzzle[12] = prev[5];
                puzzle[14] = prev[4];
            }
            break;
        }
        case "x": {
            for (var i = 0; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(-angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                // rx
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[1];
                puzzle[1] = prev[3];
                puzzle[2] = prev[0];
                puzzle[3] = prev[2];
                puzzle[8] = prev[6];
                puzzle[9] = prev[4];
                puzzle[10] = prev[7];
                puzzle[11] = prev[5];
                // lx
                prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[2];
                puzzle[5] = prev[0];
                puzzle[6] = prev[3];
                puzzle[7] = prev[1];
                puzzle[12] = prev[5];
                puzzle[13] = prev[7];
                puzzle[14] = prev[4];
                puzzle[15] = prev[6];
            }
            break;
        }
        case "xp": {
            for (var i = 0; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(angleIncrement, 0, 0);
            }

            if (stick) {
                // reassign cuboid indices
                // rxp
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[8], puzzle[9], puzzle[10], puzzle[11]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[0];
                puzzle[2] = prev[3];
                puzzle[3] = prev[1];
                puzzle[8] = prev[5];
                puzzle[9] = prev[7];
                puzzle[10] = prev[4];
                puzzle[11] = prev[6];
                // lxp
                prev = [puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[4] = prev[1];
                puzzle[5] = prev[3];
                puzzle[6] = prev[0];
                puzzle[7] = prev[2];
                puzzle[12] = prev[6];
                puzzle[13] = prev[4];
                puzzle[14] = prev[7];
                puzzle[15] = prev[5];
            }
            break;
        }
        case "y2": {
            for (var i = 0; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(0, 2*angleIncrement, 0);
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[2], puzzle[5], puzzle[7], puzzle[9], puzzle[11], puzzle[12], puzzle[14]];
                puzzle[0] = prev[3];
                puzzle[2] = prev[2];
                puzzle[5] = prev[1];
                puzzle[7] = prev[0];
                puzzle[9] = prev[7];
                puzzle[11] = prev[6];
                puzzle[12] = prev[5];
                puzzle[14] = prev[4];
                prev = [puzzle[1], puzzle[3], puzzle[4], puzzle[6], puzzle[8], puzzle[10], puzzle[13], puzzle[15]];
                puzzle[1] = prev[3];
                puzzle[3] = prev[2];
                puzzle[4] = prev[1];
                puzzle[6] = prev[0];
                puzzle[8] = prev[7];
                puzzle[10] = prev[6];
                puzzle[13] = prev[5];
                puzzle[15] = prev[4];
            }
            break;
        }
        case "z2": {
            for (var i = 0; i < 16; i++) {
                puzzle[i].localAxisLocalTurn(0, 0, 2*angleIncrement);
            }

            if (stick) {
                // f2
                var prev = [puzzle[2], puzzle[3], puzzle[6], puzzle[7], puzzle[10], puzzle[11], puzzle[14], puzzle[15]];
                puzzle[2] = prev[2];
                puzzle[3] = prev[3];
                puzzle[6] = prev[0];
                puzzle[7] = prev[1];
                puzzle[10] = prev[6];
                puzzle[11] = prev[7];
                puzzle[14] = prev[4];
                puzzle[15] = prev[5];
                // b2
                prev = [puzzle[0], puzzle[1], puzzle[4], puzzle[5], puzzle[8], puzzle[9], puzzle[12], puzzle[13]];
                puzzle[0] = prev[2];
                puzzle[1] = prev[3];
                puzzle[4] = prev[0];
                puzzle[5] = prev[1];
                puzzle[8] = prev[6];
                puzzle[9] = prev[7];
                puzzle[12] = prev[4];
                puzzle[13] = prev[5];
            }
            break;
        }
        case "gyroA": {
            puzzle[14].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[7].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[15].mesh.translateLocalMesh(new Vector3(3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[6].mesh.translateLocalMesh(new Vector3((animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[3].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[10].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[2].mesh.translateLocalMesh(new Vector3(-(animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[11].mesh.translateLocalMesh(new Vector3(-3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));

            puzzle[13].mesh.translateLocalMesh(new Vector3(3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[4].mesh.translateLocalMesh(new Vector3((animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[1].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[8].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[12].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[5].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[0].mesh.translateLocalMesh(new Vector3(-(animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[9].mesh.translateLocalMesh(new Vector3(-3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));

            if (separated) {
                puzzle[15].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[6].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[2].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
                puzzle[11].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));

                puzzle[13].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[4].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[0].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
                puzzle[9].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[8], puzzle[9], puzzle[10], puzzle[11], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[5] = prev[0];
                puzzle[0] = prev[1];
                puzzle[7] = prev[2];
                puzzle[2] = prev[3];
                puzzle[1] = prev[4];
                puzzle[4] = prev[5];
                puzzle[3] = prev[6];
                puzzle[6] = prev[7];

                puzzle[9] = prev[8];
                puzzle[12] = prev[9];
                puzzle[11] = prev[10];
                puzzle[14] = prev[11];
                puzzle[13] = prev[12];
                puzzle[8] = prev[13];
                puzzle[15] = prev[14];
                puzzle[10] = prev[15];
            }
            break;
        }
        case "gyroB": {
            puzzle[15].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[15].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[15].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[6].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[6].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[6].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[2].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[2].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[2].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[11].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[11].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[11].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[9].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[9].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[9].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[0].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[0].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[0].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));



            puzzle[13].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[13].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[13].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[4].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[4].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[4].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            break;
        }
        case "gyroC": {
            puzzle[15].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[15].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[15].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[6].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[6].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[6].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[14].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[14].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[14].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[7].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[7].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[7].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[2].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[2].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[2].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[11].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[11].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[11].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[3].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[3].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[3].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[10].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[10].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[10].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[9].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[9].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[9].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[0].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[0].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[0].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[8].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[8].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[8].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[1].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[1].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[1].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));



            puzzle[13].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[13].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[13].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[4].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[4].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[4].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[12].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[12].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[12].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[5].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[5].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[5].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            break;
        }
        case "gyropA": {
            puzzle[14].mesh.translateLocalMesh(new Vector3(3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[7].mesh.translateLocalMesh(new Vector3((animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[10].mesh.translateLocalMesh(new Vector3(-3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[3].mesh.translateLocalMesh(new Vector3(-(animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[6].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[15].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[2].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[11].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));

            puzzle[13].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[4].mesh.translateLocalMesh(new Vector3(0, (animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[0].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[9].mesh.translateLocalMesh(new Vector3(0, -(animationIncrement * (1 + 2*scaleDistance)), 0));
            puzzle[1].mesh.translateLocalMesh(new Vector3(-(animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[8].mesh.translateLocalMesh(new Vector3(-3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[5].mesh.translateLocalMesh(new Vector3((animationIncrement * (1 + 2*scaleDistance)), 0, 0));
            puzzle[12].mesh.translateLocalMesh(new Vector3(3 * (animationIncrement * (1 + 2*scaleDistance)), 0, 0));

            if (separated) {
                puzzle[14].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[7].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[10].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
                puzzle[3].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));

                puzzle[1].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
                puzzle[8].mesh.translateLocalMesh(new Vector3(-2 * animationIncrement, 0, 0));
                puzzle[5].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
                puzzle[12].mesh.translateLocalMesh(new Vector3(2 * animationIncrement, 0, 0));
            }

            if (stick) {
                // reassign cuboid indices
                var prev = [puzzle[0], puzzle[1], puzzle[2], puzzle[3], puzzle[4], puzzle[5], puzzle[6], puzzle[7], puzzle[8], puzzle[9], puzzle[10], puzzle[11], puzzle[12], puzzle[13], puzzle[14], puzzle[15]];
                puzzle[0] = prev[5];
                puzzle[1] = prev[0];
                puzzle[2] = prev[7];
                puzzle[3] = prev[2];
                puzzle[4] = prev[1];
                puzzle[5] = prev[4];
                puzzle[6] = prev[3];
                puzzle[7] = prev[6];

                puzzle[8] = prev[9];
                puzzle[9] = prev[12];
                puzzle[10] = prev[11];
                puzzle[11] = prev[14];
                puzzle[12] = prev[13];
                puzzle[13] = prev[8];
                puzzle[14] = prev[15];
                puzzle[15] = prev[10];
            }
            break;
        }
        case "gyropB": {
            puzzle[10].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[10].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[10].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[3].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[3].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[3].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[7].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[7].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[7].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[14].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[14].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[14].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[12].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[12].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[12].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[5].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[5].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[5].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));



            puzzle[8].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[8].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[8].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[1].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[1].localAxisLocalTurn(2*angleIncrement, 0, 0);
            puzzle[1].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            break;
        }
        case "gyropC": {
            puzzle[15].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[15].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[15].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[6].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[6].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[6].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[14].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[14].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[14].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[7].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[7].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[7].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[2].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[2].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[2].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[11].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[11].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[11].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[3].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[3].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[3].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));

            puzzle[10].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            puzzle[10].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[10].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));



            puzzle[9].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[9].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[9].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[0].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[0].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[0].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[8].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[8].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[8].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[1].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[1].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[1].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));



            puzzle[13].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[13].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[13].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[4].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[4].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[4].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[12].mesh.translateLocalPosition(new Vector3(-1.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[12].localAxisLocalTurn(0, -angleIncrement, 0);
            puzzle[12].mesh.translateLocalPosition(new Vector3(1.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));

            puzzle[5].mesh.translateLocalPosition(new Vector3(-0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance), 0.5 * (1 + 2*scaleDistance)));
            puzzle[5].localAxisLocalTurn(0, angleIncrement, 0);
            puzzle[5].mesh.translateLocalPosition(new Vector3(0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance), -0.5 * (1 + 2*scaleDistance)));
            break;
        }
        default: {
            break;
        }
    }

    // reseparate after turn
    if (separateBeforeTurn) {
        for (var i = 0; i < 4; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(1, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(1, 0, 0));
        }
        for (var i = 4; i < 8; i++) {
            puzzle[i].mesh.translateLocalMesh(new Vector3(-1, 0, 0));
            puzzle[i + 8].mesh.translateLocalMesh(new Vector3(-1, 0, 0));
        }
    }
}

// debugging
function highlightPiece(i) {
    for (var j = 0; j < puzzle[i].mesh.triangleList.length; j++) {
        puzzle[i].mesh.triangleList[j].fill = "#000000ff";
    }
}

var backgroundColor = [0, 0, 0];
var turnList = [];
var turnListIndex = -1;
var oppositeTurns = {
    "lx": "lxp",
    "lxp": "lx",
    "ly": "lyp",
    "lyp": "ly",
    "lz": "lzp",
    "lzp": "lz",
    "rx": "rxp",
    "rxp": "rx",
    "ry": "ryp",
    "ryp": "ry",
    "rz": "rzp",
    "rzp": "rz",
    "ix": "ixp",
    "ixp": "ix",
    "ox": "oxp",
    "oxp": "ox",
    "u2": "u2",
    "f2": "f2",
    "d2": "d2",
    "b2": "b2",
    "x": "xp",
    "xp": "x",
    "y2": "y2",
    "z2": "z2",
    "gyroA": "gyropA",
    "gyropA": "gyroA",
};

var recentTimeout;
var undoMove = false;
var redoMove = false;
function handleTurning() {
    if (animationProgress > 0.99 && animating == ANIMATION.TURN) {
        animating = ANIMATION.NONE;
        animateTurn(puzzle, true);
        animationProgress = 0;
        animationIncrement = 0;
        if (!scrambling && hasBeenSolved) {
            hasBeenSolved = false; // remove solve message after another turn
        }
        if (!scrambling && hasBeenScrambled) {
            hasBeenSolved = checkSolved();
        }
        if (hasBeenSolved != prevHasBeenSolved) {
            prevHasBeenSolved = hasBeenSolved;
            if (hasBeenSolved) {
                backgroundColor[1] = 255;
                playAudio(solveSound, false);
                hasBeenScrambled = false;
            }
        }
        if (!scrambling && !undoMove && !redoMove && (turnType != "gyroB" && turnType != "gyroC" && turnType != "gyropB" && turnType != "gyropC")) {
            turnListIndex++;
            if (turnListIndex < turnList.length) {
                turnList.length = turnListIndex;
            }
            turnList.push(turnType);
        }
        if (undoMove) {
            undoMove = false;
        }
        if (redoMove) {
            redoMove = false;
        }
        if (turnType == "gyroA") {
            turnType = "gyroB";
            animating = ANIMATION.WAIT_SUCCESSIVE_ANIM;
            recentTimeout = setTimeout(() => {animating = ANIMATION.TURN}, (instantGyros || scrambling) ? 5 : 100);
        } else if (turnType == "gyroB") {
            turnType = "gyroC";
            animating = ANIMATION.WAIT_SUCCESSIVE_ANIM;
            recentTimeout = setTimeout(() => {animating = ANIMATION.TURN}, (instantGyros || scrambling) ? 5 : 100);
        } else if (turnType == "gyroC") {
            if (instantGyros && !scrambling) { turnSpeed = speedList[turnSpeedIndex] / 15; }
        }
        if (turnType == "gyropA") {
            turnType = "gyropB";
            animating = ANIMATION.WAIT_SUCCESSIVE_ANIM;
            recentTimeout = setTimeout(() => {animating = ANIMATION.TURN}, (instantGyros || scrambling) ? 5 : 100);
        } else if (turnType == "gyropB") {
            turnType = "gyropC";
            animating = ANIMATION.WAIT_SUCCESSIVE_ANIM;
            recentTimeout = setTimeout(() => {animating = ANIMATION.TURN}, (instantGyros || scrambling) ? 5 : 100);
        } else if (turnType == "gyropC") {
            if (instantGyros && !scrambling) { turnSpeed = speedList[turnSpeedIndex] / 15; }
        }
        if (scrambling) {
            scrambleTurnCount++;
            if (scrambleTurnCount > targetScrambleTurnCount) {
                scrambling = false;
                turnList = [];
                turnListIndex = -1;
                hasBeenSolved = false;
                hasBeenScrambled = true;
                turnSpeed = speedList[turnSpeedIndex] / 15;
            }
        }
    }
    // scramble
    if (scrambling && scrambleTurn != "" && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = scrambleTurn;
        animating = ANIMATION.TURN;
    }
    // undo
    if (checkKeyBind(["Control", "z"]) && animating == ANIMATION.NONE) {
        // else, cannot undo
        if (turnList.length > 0 && turnListIndex >= 0) {
            turnType = oppositeTurns[turnList[turnListIndex--]];
            if (turnType == "gyroA" || turnType == "gyropA") {
                undoMove = true;
                if ((instantGyros && instantGyroTimer > instantGyroDelay) || (!instantGyros)) {
                    animationProgress = 0;
                    animationIncrement = 0;
                    if (instantGyros) { turnSpeed = 1000; }
                    animating = ANIMATION.TURN;
                    instantGyroTimer = 0;
                }
            } else {
                undoMove = true;
                animationProgress = 0;
                animationIncrement = 0;
                animating = ANIMATION.TURN;
            }
        }
    }
    // redo
    if ((checkKeyBind(["Control", "Z"]) || checkKeyBind(["Control", "y"])) && animating == ANIMATION.NONE) {
        // else, cannot redo
        if (turnList.length > 0 && turnListIndex < turnList.length - 1) {
            turnType = turnList[++turnListIndex];
            if (turnType == "gyroA" || turnType == "gyropA") {
                redoMove = true;
                if ((instantGyros && instantGyroTimer > instantGyroDelay) || (!instantGyros)) {
                    animationProgress = 0;
                    animationIncrement = 0;
                    if (instantGyros) { turnSpeed = 1000; }
                    animating = ANIMATION.TURN;
                    instantGyroTimer = 0;
                }
            } else {
                redoMove = true;
                animationProgress = 0;
                animationIncrement = 0;
                animating = ANIMATION.TURN;
            }
        }
    }
    // lx
    if (checkKeyBind(keyBinds.lxTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "lx";
        animating = ANIMATION.TURN;
    }
    // ly
    if (checkKeyBind(keyBinds.lyTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ly";
        animating = ANIMATION.TURN;
    }
    // lz
    if (checkKeyBind(keyBinds.lzTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "lz";
        animating = ANIMATION.TURN;
    }
    // rx
    if (checkKeyBind(keyBinds.rxTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "rx";
        animating = ANIMATION.TURN;
    }
    // ry
    if (checkKeyBind(keyBinds.ryTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ry";
        animating = ANIMATION.TURN;
    }
    // rz
    if (checkKeyBind(keyBinds.rzTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "rz";
        animating = ANIMATION.TURN;
    }
    // ix
    if (checkKeyBind(keyBinds.ixTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ix";
        animating = ANIMATION.TURN;
    }
    // ox
    if (checkKeyBind(keyBinds.oxTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ox";
        animating = ANIMATION.TURN;
    }
    // lx'
    if (checkKeyBind(keyBinds.lxPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "lxp";
        animating = ANIMATION.TURN;
    }
    // ly'
    if (checkKeyBind(keyBinds.lyPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "lyp";
        animating = ANIMATION.TURN;
    }
    // lz'
    if (checkKeyBind(keyBinds.lzPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "lzp";
        animating = ANIMATION.TURN;
    }
    // rx'
    if (checkKeyBind(keyBinds.rxPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "rxp";
        animating = ANIMATION.TURN;
    }
    // ry'
    if (checkKeyBind(keyBinds.ryPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ryp";
        animating = ANIMATION.TURN;
    }
    // rz'
    if (checkKeyBind(keyBinds.rzPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "rzp";
        animating = ANIMATION.TURN;
    }
    // ix'
    if (checkKeyBind(keyBinds.ixPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "ixp";
        animating = ANIMATION.TURN;
    }
    // ox'
    if (checkKeyBind(keyBinds.oxPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "oxp";
        animating = ANIMATION.TURN;
    }
    // u2
    if (checkKeyBind(keyBinds.u2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "u2";
        animating = ANIMATION.TURN;
    }
    // f2
    if (checkKeyBind(keyBinds.f2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "f2";
        animating = ANIMATION.TURN;
    }
    // b2
    if (checkKeyBind(keyBinds.b2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "b2";
        animating = ANIMATION.TURN;
    }
    // d2
    if (checkKeyBind(keyBinds.d2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "d2";
        animating = ANIMATION.TURN;
    }
    // x
    if (checkKeyBind(keyBinds.xTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "x";
        animating = ANIMATION.TURN;
    }
    // x'
    if (checkKeyBind(keyBinds.xPrimeTurn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "xp";
        animating = ANIMATION.TURN;
    }
    // y2
    if (checkKeyBind(keyBinds.y2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "y2";
        animating = ANIMATION.TURN;
    }
    // z2
    if (checkKeyBind(keyBinds.z2Turn) && animating == ANIMATION.NONE) {
        animationProgress = 0;
        animationIncrement = 0;
        turnType = "z2";
        animating = ANIMATION.TURN;
    }
    // gyro
    if (checkKeyBind(keyBinds.gyro) && animating == ANIMATION.NONE) {
        if ((instantGyros && instantGyroTimer > instantGyroDelay) || (!instantGyros)) {
            animationProgress = 0;
            animationIncrement = 0;
            if (instantGyros) { turnSpeed = 1000; }
            turnType = "gyroA";
            animating = ANIMATION.TURN;
            instantGyroTimer = 0;
        }
    }
    // gyro'
    if (checkKeyBind(keyBinds.gyroPrime) && animating == ANIMATION.NONE) {
        if ((instantGyros && instantGyroTimer > instantGyroDelay) || (!instantGyros)) {
            animationProgress = 0;
            animationIncrement = 0;
            if (instantGyros) { turnSpeed = 1000; }
            turnType = "gyropA";
            animating = ANIMATION.TURN;
            instantGyroTimer = 0;
        }
    }

    if (animating == ANIMATION.TURN && animationProgress == 0) {
        if (soundEffectsOn == 1) {
            if (!scrambling) {
                if (turnType == "gyroA" || turnType == "gyropA") {
                    playAudio(gyroSound, true);
                } else if (turnType != "gyroB" && turnType != "gyroC" && turnType != "gyropB" && turnType != "gyropC") {
                    if (turnType == "x" || turnType == "xp" || turnType == "y2" || turnType == "z2") {
                        playAudio(orient2Sound, true);
                    } else {
                        playAudio(turnSound, true);
                    }
                }
            }
        } else if (soundEffectsOn == 2) {
            if (!scrambling) {
                if (turnType == "gyroA" || turnType == "gyropA") {
                    playAudio(brainfartSound, true);
                } else if (turnType != "gyroB" && turnType != "gyroC" && turnType != "gyropB" && turnType != "gyropC") {
                    playAudio(vineboomSound, true);
                }
            }
        }
    }
}

function checkBoxHover(x, y, w, h) {
    if (mousePos.x >= x && mousePos.x <= x + w && mousePos.y >= y && mousePos.y <= y + h) {
        return true;
    }
    return false;
}

var settingsScroll = 0;
var settingsButtonTimer = 0;
var settingsButtonDelay = 30;
var settingsButtonHoveringClickless = false;
function renderSettingsButton() {
    // three bars
    ctx.beginPath();
    ctx.fillStyle = "#ffffffff";
    ctx.roundRect(35, 42, 40, 5, 8);
    ctx.roundRect(35, 52, 40, 5, 8);
    ctx.roundRect(35, 62, 40, 5, 8);
    ctx.fill();
    
    // box
    ctx.beginPath();
    if (checkBoxHover(30, 30, 50, 50)) {
        ctx.fillStyle = "#80808080";
        if (settingsButtonHoveringClickless && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
            if (screen == SCREENTYPE.PUZZLE) {
                screen = SCREENTYPE.PUZZLE_TO_SETTINGS;
            } else if (screen == SCREENTYPE.SETTINGS) {
                screen = SCREENTYPE.SETTINGS_TO_PUZZLE;
            }
            if (soundEffectsOn == 1) {
                playAudio(orientSound, false);
            } else if (soundEffectsOn == 2) {
                playAudio(fartSound, false);
            }
            settingsButtonTimer = 0;
        }
    } else {
        ctx.fillStyle = "#40404080";
    }
    ctx.roundRect(30, 30, 50, 50, 8);
    ctx.fill();

    settingsButtonHoveringClickless = checkBoxHover(30, 30, 50, 50) && !mouseDown;
}

var helpButtonHoveringClickless = false;
function renderHelpButton() {
    // question mark
    ctx.beginPath();
    ctx.fillStyle = "#ffffffff";
    ctx.font = "40px Courier New";
    ctx.fillText("?", 112, 65);
    
    // box
    ctx.beginPath();
    if (checkBoxHover(100, 30, 50, 50)) {
        ctx.fillStyle = "#80808080";
        if (helpButtonHoveringClickless && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
            if (screen == SCREENTYPE.PUZZLE) {
                screen = SCREENTYPE.PUZZLE_TO_HELPINFO;
            } else if (screen == SCREENTYPE.HELPINFO) {
                screen = SCREENTYPE.HELPINFO_TO_PUZZLE;
            }
            if (soundEffectsOn == 1) {
                playAudio(orientSound, false);
            } else if (soundEffectsOn == 2) {
                playAudio(fartSound, false);
            }
            settingsButtonTimer = 0;
        }
    } else {
        ctx.fillStyle = "#40404080";
    }
    ctx.roundRect(100, 30, 50, 50, 8);
    ctx.fill();

    helpButtonHoveringClickless = checkBoxHover(100, 30, 50, 50) && !mouseDown;
}

function toggleScramblePuzzle() {
    scrambling = true;
    turnList = [];
    turnListIndex = -1;
    scrambleTurn = "";
    scrambleTurnCount = 0;
    turnSpeed = 1;
    if (soundEffectsOn == 1) {
        var temp = scrambleSound.cloneNode(true);
        temp.playbackRate = Math.min(16, 50 / targetScrambleTurnCount);
        temp.play();
    } else if (soundEffectsOn == 2) {
        playAudio(fartSound, false);
    }
}

var scrambling = false;
var scrambleTurn = "";
var scrambleTurnCount = 0;
var hasBeenScrambled = false;
var targetScrambleTurnCount = 49;
function renderScrambleButton() {
    // box
    ctx.beginPath();
    if (checkBoxHover(100, 30, 170, 50)) {
        ctx.fillStyle = "#80808080";
        if (mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
            toggleScramblePuzzle();
            settingsButtonTimer = 0;
        }
    } else {
        ctx.fillStyle = "#40404080";
    }
    ctx.roundRect(100, 30, 170, 50, 8);
    ctx.fill();

    // text
    ctx.beginPath();
    ctx.fillStyle = "#ffffffff";
    ctx.font = "30px Courier New";
    ctx.fillText("Scramble", 110, 64);
}

function resetPuzzleColors() {
    setCuboidAllColors(0, 0, [7, 1, 5, 2]);
    setCuboidAllColors(1, 1, [0, 7, 2, 5]);
    setCuboidAllColors(2, 1, [4, 2, 7, 1]);
    setCuboidAllColors(3, 0, [2, 4, 0, 7]);
    setCuboidAllColors(4, 0, [0, 7, 3, 5]);
    setCuboidAllColors(5, 1, [7, 1, 5, 3]);
    setCuboidAllColors(6, 1, [3, 4, 0, 7]);
    setCuboidAllColors(7, 0, [4, 3, 7, 1]);
    setCuboidAllColors(8, 0, [0, 6, 2, 5]);
    setCuboidAllColors(9, 1, [6, 1, 5, 2]);
    setCuboidAllColors(10, 1, [2, 4, 0, 6]);
    setCuboidAllColors(11, 0, [4, 2, 6, 1]);
    setCuboidAllColors(12, 0, [6, 1, 5, 3]);
    setCuboidAllColors(13, 1, [0, 6, 3, 5]);
    setCuboidAllColors(14, 1, [4, 3, 6, 1]);
    setCuboidAllColors(15, 0, [3, 4, 0, 6]);
}

function toggleResetPuzzle() {
    clearTimeout(recentTimeout);
    scrambling = false;
    turnList = [];
    turnListIndex = -1;
    // separated = false;
    // scaleDistance = 0;
    hasBeenScrambled = false;
    hasBeenSolved = false;
    turnSpeed = speedList[turnSpeedIndex] / 15;
    animationProgress = 0;
    animating = ANIMATION.NONE;
    // puzzle = create2to4(new Vector3(0, 0, 2));
    resetPuzzleColors();
    // referenceAxisMesh.resetEuler();
    if (soundEffectsOn == 1) {
        playAudio(orientSound, false);
    } else if (soundEffectsOn == 2) {
        playAudio(fartSound, false);
    }
}

function renderResetButton() {
    // box
    ctx.beginPath();
    if (checkBoxHover(290, 30, 110, 50)) {
        ctx.fillStyle = "#80808080";
        if (mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
            toggleResetPuzzle();
            settingsButtonTimer = 0;
        }
    } else {
        ctx.fillStyle = "#40404080";
    }
    ctx.roundRect(290, 30, 110, 50, 8);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "#ffffffff";
    ctx.font = "30px Courier New";
    ctx.fillText("Reset", 300, 64);
}

function renderSettingsScreenButtons() {
    var settingsScreenButtonHeight = 90;

    renderPasteAllSettings(settingsScreenButtonHeight); settingsScreenButtonHeight += 120;

    // sfx button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    message = "";
    if (soundEffectsOn == 0) {
        ctx.fillStyle = "#ff0000ff";
        message = "SFX: OFF";
    } else if (soundEffectsOn == 1) {
        ctx.fillStyle = "#00ff00ff";
        message = "SFX: ON";
    } else if (soundEffectsOn == 2) {
        ctx.fillStyle = "#00ff00ff";
        message = "SFX: Goofy";
    }
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        soundEffectsOn++; soundEffectsOn %= 3;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
        settingsButtonTimer = 0;
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 120;

    // turn speed button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = "#ffffffff";
    message = `Turn Speed: ${15*turnSpeed}`;
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        turnSpeedIndex++; turnSpeedIndex %= speedList.length;
        turnSpeed = speedList[turnSpeedIndex] / 15;
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 60;

    // instant gyros button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    message = "";
    if (instantGyros) {
        ctx.fillStyle = "#00ff00ff";
        message = "Instant Gyros: ON";
    } else {
        ctx.fillStyle = "#ff0000ff";
        message = "Instant Gyros: OFF";
    }
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        instantGyros = !instantGyros;
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 60;

    // scramble count button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    message = "";
    ctx.fillStyle = "#ffffffff";
    message = `Scramble Count: ${targetScrambleTurnCount + 1}`;
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        targetScrambleTurnCount = Number(prompt(`Type the number of turns to make per scramble:`)) - 1;
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 120;

    // FOV button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    message = "";
    ctx.fillStyle = "#ffffffff";
    message = `FOV: ${Math.round((FOV) * (180 / Math.PI))}`;
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        FOV = Number(prompt(`Type the desired FOV:`)) * (Math.PI / 180);
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 60;

    // cam dist button
    ctx.beginPath();
    ctx.font = "40px Courier New";
    message = "";
    ctx.fillStyle = "#ffffffff";
    message = `Camera Distance: ${puzzleSolverDistance}`;
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        puzzleSolverDistance = Number(prompt(`Type the desired camera distance:`));
        updatePuzzleDistance();
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), settingsScreenButtonHeight + 30 + settingsScroll);

    settingsScreenButtonHeight += 120;

    renderPasteKeybind(settingsScreenButtonHeight); settingsScreenButtonHeight += 60;

    keyBinds.separate = renderKeybind(keyBinds.separate, "Separate", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.resetOrientation = renderKeybind(keyBinds.resetOrientation, "Reorient", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.scramble = renderKeybind(keyBinds.scramble, "Scramble", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.reset = renderKeybind(keyBinds.reset, "Reset", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lxTurn = renderKeybind(keyBinds.lxTurn, "Lx", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lxPrimeTurn = renderKeybind(keyBinds.lxPrimeTurn, "Lx'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lyTurn = renderKeybind(keyBinds.lyTurn, "Ly", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lyPrimeTurn = renderKeybind(keyBinds.lyPrimeTurn, "Ly'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lzTurn = renderKeybind(keyBinds.lzTurn, "Lz", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.lzPrimeTurn = renderKeybind(keyBinds.lzPrimeTurn, "Lz'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.rxTurn = renderKeybind(keyBinds.rxTurn, "Rx", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.rxPrimeTurn = renderKeybind(keyBinds.rxPrimeTurn, "Rx'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.ryTurn = renderKeybind(keyBinds.ryTurn, "Ry", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.ryPrimeTurn = renderKeybind(keyBinds.ryPrimeTurn, "Ry'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.rzTurn = renderKeybind(keyBinds.rzTurn, "Rz", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.rzPrimeTurn = renderKeybind(keyBinds.rzPrimeTurn, "Rz'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.ixTurn = renderKeybind(keyBinds.ixTurn, "Ix", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.ixPrimeTurn = renderKeybind(keyBinds.ixPrimeTurn, "Ix'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.oxTurn = renderKeybind(keyBinds.oxTurn, "Ox", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.oxPrimeTurn = renderKeybind(keyBinds.oxPrimeTurn, "Ox'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.u2Turn = renderKeybind(keyBinds.u2Turn, "U2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.f2Turn = renderKeybind(keyBinds.f2Turn, "F2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.d2Turn = renderKeybind(keyBinds.d2Turn, "D2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.b2Turn = renderKeybind(keyBinds.b2Turn, "B2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.xTurn = renderKeybind(keyBinds.xTurn, "x", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.xPrimeTurn = renderKeybind(keyBinds.xPrimeTurn, "x'", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.y2Turn = renderKeybind(keyBinds.y2Turn, "y2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.z2Turn = renderKeybind(keyBinds.z2Turn, "z2", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.gyro = renderKeybind(keyBinds.gyro, "Gyro", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    keyBinds.gyroPrime = renderKeybind(keyBinds.gyroPrime, "Gyro'", settingsScreenButtonHeight); settingsScreenButtonHeight += 120;

    renderPasteColors(settingsScreenButtonHeight); settingsScreenButtonHeight += 60;

    renderColorSchemeButton(colorScheme[0], "White", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[1], "Yellow", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[2], "Red", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[3], "Orange", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[4], "Green", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[5], "Blue", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[6], "Pink", settingsScreenButtonHeight); settingsScreenButtonHeight += 60;
    renderColorSchemeButton(colorScheme[7], "Purple", settingsScreenButtonHeight); settingsScreenButtonHeight += 120;
}

function renderHelpScreenText() {
    var helpScreenTextHeight = 90;

    // notes
    writeNote("Help/Info", helpScreenTextHeight, 40); helpScreenTextHeight += 120;
    writeNote("Overview", helpScreenTextHeight, 40); helpScreenTextHeight += 60;
    writeNote("A virtual simulation of the physical 2x2x2x2 puzzle.\nAlso commonly called the 2^4.\n\nThe original physical puzzle was\ncreated by Melinda Green.", helpScreenTextHeight, 20); helpScreenTextHeight += 160;
    writeNote("Controls", helpScreenTextHeight, 40); helpScreenTextHeight += 60;
    writeNote("Orienting does not change what turns will do.\nUse the x, x', y2, z2 controls, and reference axis,\nto make sense of a move in a particular orientation.", helpScreenTextHeight, 20); helpScreenTextHeight += 100;
    writeNote("Rotate Puzzle: Click & Drag", helpScreenTextHeight, 20); helpScreenTextHeight += 60;
    writeNote("Explode Pieces: Scroll", helpScreenTextHeight, 20); helpScreenTextHeight += 60;
}

function writeNote(note, y, size) {
    ctx.beginPath();
    ctx.font = `${size}px Courier New`;
    ctx.fillStyle = "#ffff00ff";
    note = note.split("\n");
    for (var i = 0; i < note.length; i++) {
        ctx.fillText(note[i], (c.width / 2) - (ctx.measureText(note[i]).width / 2), y + 30 + (size * i) + settingsScroll);
    }
}

function renderColorSchemeButton(color, colorName, y) {
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = color;
    message = `Color ${colorName}: ${color}`;
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), y + 30 + settingsScroll);
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), y + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        var userColor = prompt("Type the desired color in hexadecimal RGBA format. Example format: '#ff0000ff'");
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
        var newColors = [...colorScheme];
        newColors[newColors.indexOf(color)] = userColor;
        updateColorScheme(newColors);
    }
}

function renderKeybind(keyBind, keyBindName, y) {
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = "#ffffffff";
    message = `Keybind ${keyBindName}: ${JSON.stringify(keyBind)}`;
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), y + 30 + settingsScroll);
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), y + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        userKeyBind = prompt("Type the desired keybind. Do not type space unless as a key. To use a comma as a key, type 'comma'. Example formats: 'R,P', 'q, ', 'e,comma'");
        userKeyBind = userKeyBind.split(",");
        for (var i = 0; i < userKeyBind.length; i++) {
            if (userKeyBind[i] == "comma") {
                userKeyBind[i] = ",";
            }
        }
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
        return [...userKeyBind];
    }
    return keyBind;
}

function renderPasteColors(y) {
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = "#ffffffff";
    message = `Copy/Paste Colors`;
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), y + 30 + settingsScroll);
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), y + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        var newColors;
        newColors = prompt(`If you have a color scheme, you may paste it below. You may also copy your current color scheme: ${JSON.stringify(colorScheme)}`);
        if (newColors != null && newColors != "") {
            newColors = JSON.parse(newColors);
            updateColorScheme(newColors);
        }
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
}

function renderPasteKeybind(y) {
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = "#ffffffff";
    message = `Copy/Paste Keybinds`;
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), y + 30 + settingsScroll);
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), y + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        userKeyBind = prompt(`If you have a keybind set, you may paste it below. You may also copy your current keybind set: ${JSON.stringify(keyBinds)}`);
        if (userKeyBind != null && userKeyBind != "") {
            userKeyBind = JSON.parse(userKeyBind);
            keyBinds = userKeyBind;
        }
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
}

function renderPasteAllSettings(y) {
    ctx.beginPath();
    ctx.font = "40px Courier New";
    ctx.fillStyle = "#ffffffff";
    message = `Copy/Paste All Settings`;
    ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), y + 30 + settingsScroll);
    if (checkBoxHover((c.width / 2) - (ctx.measureText(message).width / 2), y + settingsScroll, ctx.measureText(message).width, 40) && mouseDown && mouseButton == 1 && settingsButtonTimer > settingsButtonDelay) {
        mouseDown = false;
        var res = prompt(`If you have a settings set, you may paste it below. You may also copy your current settings set: ${JSON.stringify({sfx: soundEffectsOn, turnSpeed: turnSpeedIndex, instantGyros: instantGyros, scrambleCount: targetScrambleTurnCount, keyBinds: keyBinds, colorScheme: colorScheme})}`);
        if (res != null && res != "") {
            res = JSON.parse(res);
            soundEffectsOn = res.sfx;
            turnSpeedIndex = res.turnSpeed;
            instantGyros = res.instantGyros;
            targetScrambleTurnCount = res.scrambleCount;
            keyBinds = res.keyBinds;
            colorScheme = res.colorScheme;
            updateColorScheme(colorScheme);
        }
        settingsButtonTimer = 0;
        if (soundEffectsOn == 1) {
            playAudio(orientSound, false);
        } else if (soundEffectsOn == 2) {
            playAudio(fartSound, false);
        }
    }
}

function renderReferenceAxis() {
    ctx.translate(-(c.width / 2) + 60, (c.height / 2) - 60);
    var prevFOV = FOV;
    FOV = Math.PI / 2;
    renderMeshes([referenceAxisMesh]);
    FOV = prevFOV;
    ctx.translate((c.width / 2) - 60, -(c.height / 2) + 60);
}

var resetRotationTimer = 0;

const SCREENTYPE = {
    NULL_TO_PUZZLE: 0.1,
    PUZZLE: 1,
    PUZZLE_TO_SETTINGS: 1.2,
    PUZZLE_TO_HELPINFO: 1.3,
    SETTINGS: 2,
    SETTINGS_TO_PUZZLE: 2.1,
    HELPINFO: 3,
    HELPINFO_TO_PUZZLE: 3.1
};

var screen = SCREENTYPE.NULL_TO_PUZZLE;
var message = "";

function main() {
    switch (screen) {
        case SCREENTYPE.NULL_TO_PUZZLE: {
            screen = SCREENTYPE.PUZZLE;
            break;
        }
        case SCREENTYPE.PUZZLE: {
            // update timers
            settingsButtonTimer += deltaTime;
            resetRotationTimer += deltaTime;
            instantGyroTimer += deltaTime;

            // fade background to black
            for (var i = 0; i < 3; i++) {
                if (backgroundColor[i] > 0) {
                    backgroundColor[i] = Math.max(0, backgroundColor[i] - deltaTime);
                }
            }

            // render background
            ctx.beginPath();
            ctx.fillStyle = `rgba(${backgroundColor[0]}, ${backgroundColor[1]}, ${backgroundColor[2]}, 1)`;
            ctx.fillRect(0, 0, c.width, c.height);

            // reset check
            if (checkKeyBind(keyBinds.reset) && !scrambling) {
                toggleResetPuzzle();
            }

            // scramble check
            if (checkKeyBind(keyBinds.scramble) && !scrambling) {
                toggleScramblePuzzle();
            }

            // separate when key press
            if (!scrambling) {
                if (animationProgress > 0.99 && animating == ANIMATION.SEPARATE) {
                    animating = ANIMATION.NONE;
                    stickSeparation(puzzle);
                    animationProgress = 0;
                    animationIncrement = 0;
                }
                if (checkKeyBind(keyBinds.separate) && animating == ANIMATION.NONE) {
                    toggleSeparate();
                }
            }

            if (scrambling) {
                if (scrambleTurnCount > targetScrambleTurnCount) {
                    scrambling = false;
                    turnList = [];
                    turnListIndex = -1;
                    hasBeenSolved = false;
                    hasBeenScrambled = true;
                    turnSpeed = speedList[turnSpeedIndex] / 15;
                } else {
                    scrambleTurn = ['lx','ly','lz','rx','ry','rz','ix','ox','lxp','lyp','lzp','rxp','ryp','rzp','ixp','oxp','u2','f2','d2','b2','gyroA','gyropA'][Math.floor(Math.random() * 22)];
                }
            }
            // handle turning
            handleTurning();

            // reset rotation
            if (checkKeyBind(keyBinds.resetOrientation) && resetRotationTimer > 30) {
                for (var i = 0; i < puzzle.length; i++) {
                    puzzle[i].mesh.resetEuler();
                }
                referenceAxisMesh.resetEuler();
                if (soundEffectsOn == 1) {
                    playAudio(orientSound, false);
                } else if (soundEffectsOn == 2) {
                    playAudio(boowompSound, false);
                }
                resetRotationTimer = 0;
            }

            // mouse rotation
            if (mouseDown && (mouseButton == 1 || mouseButton == 2)) {
                for (var i = 0; i < puzzle.length; i++) {
                    puzzle[i].mesh.rotateEulerLocal(mouseDelta.y, -mouseDelta.x, 0);
                    // puzzle[i].mesh.rotateEulerLocal(mouseDelta.y / deltaTime, -mouseDelta.x / deltaTime, 0);
                }
                referenceAxisMesh.rotateEulerLocal(mouseDelta.y, -mouseDelta.x, 0);
                // referenceAxisMesh.rotateEulerLocal(mouseDelta.y / deltaTime, -mouseDelta.x / deltaTime, 0);
            }

            // render puzzle
            renderMeshes(getObjectMeshes(puzzle));

            // render reference axis
            renderReferenceAxis();

            // animation
            switch (animating) {
                case ANIMATION.SEPARATE: {
                    animateSeparation(puzzle);
                    break;
                }
                case ANIMATION.TURN: {
                    animateTurn(puzzle, false);
                    break;
                }
                default: {
                    break;
                }
            }

            // settings button
            renderSettingsButton();

            // help button
            renderHelpButton();

            // // scramble button
            // renderScrambleButton();

            // // reset button
            // renderResetButton();

            // render solved
            if (hasBeenSolved) {
                ctx.beginPath();
                ctx.fillStyle = "#00ff00ff";
                ctx.font = "20px Courier New";
                ctx.fillText("Solved!", 20, 120);
                ctx.fillText(`Scramble Count: ${targetScrambleTurnCount + 1}`, 20, 150);
                ctx.fillText(`Turn Count: ${turnList.length}`, 20, 180);
            }

            break;
        }
        case SCREENTYPE.PUZZLE_TO_SETTINGS: {
            message = "";
            screen = SCREENTYPE.SETTINGS;
            break;
        }
        case SCREENTYPE.PUZZLE_TO_HELPINFO: {
            message = "";
            screen = SCREENTYPE.HELPINFO;
            break;
        }
        case SCREENTYPE.SETTINGS: {
            // update timers
            settingsButtonTimer += deltaTime;

            // render background
            ctx.beginPath();
            ctx.fillStyle = "#000000ff";
            ctx.fillRect(0, 0, c.width, c.height);

            // hidden message
            ctx.beginPath();
            ctx.font = "20px Courier New";
            ctx.fillStyle = "#ffffffff";
            message = "hiii :3";
            ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), -520 + settingsScroll);
            message = "there's no more settings up here :C";
            ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), -1020 + settingsScroll);

            // settings button
            renderSettingsButton();

            // all other buttons on the settings screen
            renderSettingsScreenButtons();
            break;
        }
        case SCREENTYPE.SETTINGS_TO_PUZZLE: {
            screen = SCREENTYPE.PUZZLE;
            break;
        }
        case SCREENTYPE.HELPINFO: {
            // update timers
            settingsButtonTimer += deltaTime;

            // render background
            ctx.beginPath();
            ctx.fillStyle = "#000000ff";
            ctx.fillRect(0, 0, c.width, c.height);

            // // hidden message
            // ctx.beginPath();
            // ctx.font = "20px Courier New";
            // ctx.fillStyle = "#ffffffff";
            // message = "hiii :3";
            // ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), -520 + settingsScroll);
            // message = "there's no more settings up here :C";
            // ctx.fillText(message, (c.width / 2) - (ctx.measureText(message).width / 2), -1020 + settingsScroll);

            // help button
            renderHelpButton();

            // all other buttons on the settings screen
            renderHelpScreenText();

            // left-right bounds (for min res of 640x480 (480p))
            ctx.strokeStyle = "#ffffffff";
            ctx.lineWidth = 4;
            ctx.moveTo((c.width / 2) - 320, 0);
            ctx.lineTo((c.width / 2) - 320, c.height);
            ctx.moveTo((c.width / 2) + 320, 0);
            ctx.lineTo((c.width / 2) + 320, c.height);
            ctx.stroke();
            break;
        }
        case SCREENTYPE.HELPINFO_TO_PUZZLE: {
            screen = SCREENTYPE.PUZZLE;
            break;
        }
        default: {
            break;
        }
    }
}



// game loop handling
var deltaTime = 0;
var deltaCorrect = (1 / 8);
var prevTime = Date.now();
function loop() {
    deltaTime = (Date.now() - prevTime) * deltaCorrect;
    prevTime = Date.now();

    main();
    window.requestAnimationFrame(loop);
}

function init() {
    updateCanvasSize();
    window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(init);
