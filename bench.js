// bench.js
"use strict";

var canvas;
var gl;

var numPositions = 0;

var positions = [];
var colors = [];

var tx = 0.0;
var ty = 0.0;
var tz = 0.0;
var sx = 1.0;
var sy = 1.0;
var sz = 1.0;
var theta = [0, 0, 0];
var shy = 0.0; // Shear X by Y

var modelLoc;

var viewLoc, projLoc; //***
var eye = vec3(0.0, 0.0, 3.0);
var at  = vec3(0.0, 0.0, 0.0);
var up  = vec3(0.0, 1.0, 0.0);

// --- global refs untuk kontrol kamera
var exInput, eyInput, ezInput, projSelect;

var projection; //***

// Tambahkan fungsi scalem
function scalem(x, y, z) {
    return mat4(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
}

function init() {
    if (canvas) return; // Hindari inisialisasi berulang
    canvas = document.getElementById("gl-canvas");
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }

    gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error("WebGL 2.0 isn't available");
        return;
    }

    colorBench();
    console.log("Vertices and colors defined, count:", numPositions);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);  // blending untuk transparansi
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);  // Mode blending standar (src alpha * dst + (1 - src alpha) * dst color)

    var program = initShaders(gl, "vertex-shader", "fragment-shader");

    projection = perspective(45, canvas.width / canvas.height, 0.1, 10.0);

    if (!program) {
        console.error("Shader program failed to initialize");
        return;
    }
    gl.useProgram(program);


    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW);

    var colorLoc = gl.getAttribLocation(program, "aColor");
    if (colorLoc < 0) console.error("aColor location not found");
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(colorLoc);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(positions), gl.STATIC_DRAW);

    var positionLoc = gl.getAttribLocation(program, "aPosition");
    if (positionLoc < 0) console.error("aPosition location not found");
    gl.vertexAttribPointer(positionLoc, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
    
    modelLoc = gl.getUniformLocation(program, "uModel");
    viewLoc = gl.getUniformLocation(program, "uView"); ///
    projLoc = gl.getUniformLocation(program, "uProjection"); ///
    if (!modelLoc) console.error("uModel location not found");

    exInput  = document.getElementById("eyeX");
    eyInput  = document.getElementById("eyeY");
    ezInput  = document.getElementById("eyeZ");
    projSelect = document.getElementById("projectionType");

    ['input','change'].forEach(ev=>{
    if (exInput)  exInput.addEventListener(ev, updateCamera);
    if (eyInput)  eyInput.addEventListener(ev, updateCamera);
    if (ezInput)  ezInput.addEventListener(ev, updateCamera);
    if (projSelect) projSelect.addEventListener(ev, updateProjection);
    });
    // set awal sesuai nilai form
    updateCamera();
    updateProjection();

    document.addEventListener("keydown", keyHandler);

    console.log("Initialization complete, starting render...");
    render();
}


function num(v){ return parseFloat(String(v).replace(',', '.')) || 0; }

function updateCamera() {
  if (!exInput || !eyInput || !ezInput) return;
  eye = vec3(num(exInput.value), num(eyInput.value), num(ezInput.value));
}


function updateProjection() {
    let type = document.getElementById("projectionType").value;
    if (type === "perspective") {
        projection = perspective(45, canvas.width / canvas.height, 0.1, 10.0);
    } else {
        projection = ortho(-2, 2, -2, 2, -10, 10);
    }
}


// transformasi
function keyHandler(e) {
    switch (e.key) {
        case "ArrowLeft": tx -= 0.1; break;
        case "ArrowRight": tx += 0.1; break;
        case "ArrowUp": ty += 0.1; break;
        case "ArrowDown": ty -= 0.1; break;
        case "PageUp": tz += 0.1; break;
        case "PageDown": tz -= 0.1; break;
        case "x": theta[0] += 5; break;
        case "X": theta[0] -= 5; break;
        case "y": theta[1] += 5; break;
        case "Y": theta[1] -= 5; break;
        case "z": theta[2] += 5; break;
        case "Z": theta[2] -= 5; break;
        case "+": sx += 0.1; sy += 0.1; sz += 0.1; break;
        case "-": sx -= 0.1; sy -= 0.1; sz -= 0.1; break;
        case "s": shy += 0.1; break;
        case "S": shy -= 0.1; break;
        case "r":
            tx = 0; ty = 0; tz = 0;
            sx = 1; sy = 1; sz = 1;
            theta = [0, 0, 0];
            shy = 0;
            break;
    }

    render();
}

function colorBench() {
    var brown = vec4(0.6, 0.3, 0.1, 1.0); // Warna kayu untuk papan
    var black = vec4(0.1, 0.1, 0.1, 1.0); // Warna besi untuk kaki

    // Variasi warna kayu sesuai pola berdasarkan z
    var darkBrown = vec4(0.4, 0.2, 0.1, 1.0);    // Cokelat tua
    var lightBrown = vec4(0.8, 0.6, 0.4, 1.0);   // Cokelat muda
    var tanBrown = vec4(0.7, 0.4, 0.2, 0.5); // Cokelat tambahan dengan alpha 0.5 (semi-transparan)

    // Papan kayu: pecah menjadi 5 segmen berdasarkan sumbu z
    // Segmen 1 (depan, cokelat tua)
    addCuboid(vec3(-1.5, 0.4, -0.25), vec3(1.5, 0.45, -0.10), darkBrown);
    // Segmen 2 (tengah pertama, cokelat sedang, paling tipis)
    addCuboid(vec3(-1.5, 0.4, -0.10), vec3(1.5, 0.45, -0.09), tanBrown);
    // Segmen 3 (tengah, cokelat muda)
    addCuboid(vec3(-1.5, 0.4, -0.09), vec3(1.5, 0.45, 0.09), lightBrown);
    // Segmen 4 (tengah kedua, cokelat tambahan, paling tipis)
    addCuboid(vec3(-1.5, 0.4, 0.09), vec3(1.5, 0.45, 0.10), tanBrown);
    // Segmen 5 (belakang, cokelat tua)
    addCuboid(vec3(-1.5, 0.4, 0.10), vec3(1.5, 0.45, 0.25), darkBrown);

    // 3 bintik kotak hitam
    // Bintik 1: kiri-depan (x = -1.0, z = -0.03)
    addCuboid(vec3(-1.0, 0.45, -0.03), vec3(-0.9, 0.455, 0.03), black);
    // Bintik 2: tengah (x = 0.0, z = 0.0)
    addCuboid(vec3(-0.05, 0.45, -0.03), vec3(0.05, 0.455, 0.03), black);
    // Bintik 3: kanan-belakang (x = 1.0, z = 0.03)
    addCuboid(vec3(0.9, 0.45, -0.03), vec3(1.0, 0.455, 0.03), black);

    // Left leg (U shape)
    var leftLegX = -1.35;
    addCuboid(vec3(leftLegX - 0.05, 0.0, 0.20), vec3(leftLegX + 0.05, 0.4, 0.25), darkBrown); // Front vertical
    addCuboid(vec3(leftLegX - 0.05, 0.0, -0.25), vec3(leftLegX + 0.05, 0.4, -0.20), darkBrown); // Back vertical
    //border
    addCuboid(vec3(leftLegX - 0.05, 0.3, 0.20), vec3(leftLegX + 0.05, 0.4,  -0.20), brown);
    addCuboid(vec3(leftLegX + 0.05, 0.3, 0.25), vec3(leftLegX + 1.35, 0.4,  0.20), brown);
    addCuboid(vec3(leftLegX + 0.05, 0.3, -0.25), vec3(leftLegX + 1.35, 0.4,  -0.20), brown);

    // Right leg (U shape)
    var rightLegX = 1.35;
    addCuboid(vec3(rightLegX - 0.05, 0.0, 0.20), vec3(rightLegX + 0.05, 0.4, 0.25), darkBrown); // Front vertical
    addCuboid(vec3(rightLegX - 0.05, 0.0, -0.25), vec3(rightLegX + 0.05, 0.4, -0.20), darkBrown); // Back vertical
    //border
    addCuboid(vec3(rightLegX - 0.05, 0.3, 0.20), vec3(rightLegX + 0.05, 0.4,  -0.20), brown);
    addCuboid(vec3(rightLegX - 1.35, 0.3, 0.25), vec3(rightLegX - 0.05, 0.4,  0.20), brown);
    addCuboid(vec3(rightLegX - 1.35, 0.3, -0.25), vec3(rightLegX - 0.05, 0.4,  -0.20), brown);

    numPositions = positions.length;
}

function addCuboid(min, max, color) {
    var localVertices = [
        vec4(min[0], min[1], max[2], 1.0),
        vec4(min[0], max[1], max[2], 1.0),
        vec4(max[0], max[1], max[2], 1.0),
        vec4(max[0], min[1], max[2], 1.0),
        vec4(min[0], min[1], min[2], 1.0),
        vec4(min[0], max[1], min[2], 1.0),
        vec4(max[0], max[1], min[2], 1.0),
        vec4(max[0], min[1], min[2], 1.0)
    ];

    quad(1, 0, 3, 2, color, localVertices);
    quad(2, 3, 7, 6, color, localVertices);
    quad(3, 0, 4, 7, color, localVertices);
    quad(6, 5, 1, 2, color, localVertices);
    quad(4, 5, 6, 7, color, localVertices);
    quad(5, 4, 0, 1, color, localVertices);
}

function quad(a, b, c, d, color, verts) {
    var indices = [a, b, c, a, c, d];
    for (var i = 0; i < indices.length; ++i) {
        positions.push(verts[indices[i]]);
        colors.push(color);
    }
}

function render() {
    if (!gl) {
        console.error("WebGL context not available");
        return;
    }
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var rotation = mult(rotateZ(theta[2]), mult(rotateY(theta[1]), rotateX(theta[0])));
    var trans = translate(tx, ty, tz);
    var scal = scalem(sx, sy, sz); //  Menggunakan fungsi scalem yang didefinisikan
    var shear = mat4(
        1, shy, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );

    var model = mult(trans, mult(rotation, mult(scal, shear)));
    gl.uniformMatrix4fv(modelLoc, false, flatten(model));


    // *** Versi baru
    var view = lookAt(eye, at, up); 
    gl.uniformMatrix4fv(viewLoc, false, flatten(view));
    gl.uniformMatrix4fv(projLoc, false, flatten(projection));
    // ***

    gl.drawArrays(gl.TRIANGLES, 0, numPositions);
    console.log("Rendering frame...");
    requestAnimationFrame(render);
}

// call init saat dokumen siap
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
} else {
    init();
}