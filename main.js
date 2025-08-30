function resetMaze() {
    // Clear all walls
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            maze[r][c] = 0;
        }
    }
    drawMaze();
    document.getElementById('resultInfo').textContent = '';
    disableAllModes();
    updateStatisticsPanel({ nodesExplored: 0, pathLength: 0, pathCost: 0, timeTaken: 0 });
}
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const algoSelect = document.getElementById('algoSelect');

const ROWS = 20;
const COLS = 20;
const CELL_SIZE = canvas.width / COLS;

// 0: empty, 1: wall
let maze = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

// Path smoothing using line-of-sight (Theta*-like)
function hasLineOfSight(a, b) {
    // Bresenham's line algorithm for grid line-of-sight
    let x0 = a.col, y0 = a.row, x1 = b.col, y1 = b.row;
    let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (x0 !== x1 || y0 !== y1) {
        if (maze[y0][x0] === 1) return false;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return maze[y1][x1] !== 1;
}

function smoothPath(path) {
    if (path.length < 3) return path;
    let newPath = [path[0]];
    let i = 0;
    for (let j = 2; j < path.length; j++) {
        if (!hasLineOfSight(path[i], path[j])) {
            newPath.push(path[j-1]);
            i = j-1;
        }
    }
    newPath.push(path[path.length-1]);
    return newPath;
}

// Add some walls for demo
for (let i = 5; i < 15; i++) {
    maze[i][10] = 1;
}

function addRandomWalls() {
    // Clear maze
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            maze[r][c] = 0;
        }
    }
    // Add random walls, avoid start/end
    for (let i = 0; i < Math.floor(ROWS * COLS * 0.3); i++) {
        let r, c;
        do {
            r = Math.floor(Math.random() * ROWS);
            c = Math.floor(Math.random() * COLS);
        } while ((r === start.row && c === start.col) || (r === end.row && c === end.col));
        maze[r][c] = 1;
    }
    drawMaze();
    document.getElementById('resultInfo').textContent = '';
    disableAllModes();
    updateStatisticsPanel({ nodesExplored: 0, pathLength: 0, pathCost: 0, timeTaken: 0 });
}

const start = { row: 0, col: 0 };
const end = { row: ROWS - 1, col: COLS - 1 };

let weightMode = false;
let cellWeights = Array.from({ length: ROWS }, () => Array(COLS).fill(1));

function enableWeightMode() {
    weightMode = true;
    wallDrawingMode = false;
    wallRemovingMode = false;
    startPlacementMode = false;
    endPlacementMode = false;
    document.getElementById('resultInfo').textContent = 'Weight mode: Click cells to increase weight (right-click to decrease).';
}

function drawMaze(path = []) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (maze[r][c] === 1) {
                ctx.fillStyle = '#333';
            } else {
                // Color based on weight
                let w = cellWeights[r][c];
                ctx.fillStyle = `rgb(${255 - w * 20},${255 - w * 10},255)`;
            }
            ctx.fillRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = '#888';
            ctx.lineWidth = 1;
            ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            // Draw weight number if not wall
            if (maze[r][c] === 0 && cellWeights[r][c] > 1) {
                ctx.fillStyle = '#222';
                ctx.font = '12px Arial';
                ctx.fillText(cellWeights[r][c], c * CELL_SIZE + CELL_SIZE/3, r * CELL_SIZE + CELL_SIZE/1.5);
            }
        }
    }
    // Draw path
    if (path.length > 0) {
        ctx.fillStyle = 'yellow';
        for (const node of path) {
            // Skip start and end for now
            if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) continue;
            ctx.fillRect(node.col * CELL_SIZE, node.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        // Draw weight numbers on top of path
        ctx.fillStyle = '#222';
        ctx.font = '12px Arial';
        for (const node of path) {
            if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) continue;
            if (maze[node.row][node.col] === 0 && cellWeights[node.row][node.col] > 1) {
                ctx.fillText(cellWeights[node.row][node.col], node.col * CELL_SIZE + CELL_SIZE/3, node.row * CELL_SIZE + CELL_SIZE/1.5);
            }
        }
    }
    // Draw start and end distinctly
    ctx.fillStyle = '#007bff'; // blue for start
    ctx.fillRect(start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.fillStyle = '#ff5722'; // orange for end
    ctx.fillRect(end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#333';
}

drawMaze();

function heuristic(a, b) {
    return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

let diagonalEnabled = false;

function toggleDiagonal() {
    diagonalEnabled = !diagonalEnabled;
    document.getElementById('diagonalBtn').textContent = diagonalEnabled ? 'Diagonal: On' : 'Diagonal: Off';
}
window.toggleDiagonal = toggleDiagonal;

function neighbors(node) {
    const dirs = [
        { dr: -1, dc: 0 },
        { dr: 1, dc: 0 },
        { dr: 0, dc: -1 },
        { dr: 0, dc: 1 }
    ];
    if (diagonalEnabled) {
        dirs.push(
            { dr: -1, dc: -1 },
            { dr: -1, dc: 1 },
            { dr: 1, dc: -1 },
            { dr: 1, dc: 1 }
        );
    }
    const result = [];
    for (const { dr, dc } of dirs) {
        const nr = node.row + dr;
        const nc = node.col + dc;
        if (
            nr >= 0 && nr < ROWS &&
            nc >= 0 && nc < COLS &&
            maze[nr][nc] === 0
        ) {
            result.push({ row: nr, col: nc });
        }
    }
    return result;
}

// Update algorithms to use cellWeights
function aStar() {
    const t0 = performance.now();
    const openSet = [];
    openSet.push({ ...start, g: 0, f: heuristic(start, end), parent: null });
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let found = false;
    let path = [];
    let cost = 0;
    let explored = [];
    while (openSet.length > 0) {
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();
        if (visited[current.row][current.col]) continue;
        visited[current.row][current.col] = true;
        explored.push(current);
        if (current.row === end.row && current.col === end.col) {
            found = true;
            let node = current;
            while (node) {
                path.push({ row: node.row, col: node.col });
                node = node.parent;
            }
            path.reverse();
            cost = path.reduce((acc, n, i) => i === 0 ? acc : acc + cellWeights[n.row][n.col], 0);
            break;
        }
        for (const neighbor of neighbors(current)) {
            if (!visited[neighbor.row][neighbor.col]) {
                openSet.push({
                    ...neighbor,
                    g: current.g + cellWeights[neighbor.row][neighbor.col],
                    f: current.g + cellWeights[neighbor.row][neighbor.col] + heuristic(neighbor, end),
                    parent: current
                });
            }
        }
    }
    animatePath(explored, smoothPath(path));
    const t1 = performance.now();
    const infoDiv = document.getElementById('resultInfo');
    if (found) {
        infoDiv.textContent = `Cost: ${cost}, Time: ${(t1-t0).toFixed(2)} ms`;
    } else {
        infoDiv.textContent = 'No path found!';
    }
    updateStatisticsPanel({
        nodesExplored: explored.length,
        pathLength: path.length,
        pathCost: cost,
        timeTaken: (t1-t0).toFixed(2)
    });
}

function dijkstra() {
    const t0 = performance.now();
    const openSet = [];
    openSet.push({ ...start, dist: 0, parent: null });
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let found = false;
    let path = [];
    let cost = 0;
    let explored = [];
    while (openSet.length > 0) {
        openSet.sort((a, b) => a.dist - b.dist);
        const current = openSet.shift();
        if (visited[current.row][current.col]) continue;
        visited[current.row][current.col] = true;
        explored.push(current);
        if (current.row === end.row && current.col === end.col) {
            found = true;
            let node = current;
            while (node) {
                path.push({ row: node.row, col: node.col });
                node = node.parent;
            }
            path.reverse();
            cost = path.reduce((acc, n, i) => i === 0 ? acc : acc + cellWeights[n.row][n.col], 0);
            break;
        }
        for (const neighbor of neighbors(current)) {
            if (!visited[neighbor.row][neighbor.col]) {
                openSet.push({
                    ...neighbor,
                    dist: current.dist + cellWeights[neighbor.row][neighbor.col],
                    parent: current
                });
            }
        }
    }
    animatePath(explored, smoothPath(path));
    const t1 = performance.now();
    const infoDiv = document.getElementById('resultInfo');
    if (found) {
        infoDiv.textContent = `Cost: ${cost}, Time: ${(t1-t0).toFixed(2)} ms`;
    } else {
        infoDiv.textContent = 'No path found!';
    }
    updateStatisticsPanel({
        nodesExplored: explored.length,
        pathLength: path.length,
        pathCost: cost,
        timeTaken: (t1-t0).toFixed(2)
    });
}

function bfs() {
    const t0 = performance.now();
    const queue = [];
    queue.push({ ...start, parent: null });
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let found = false;
    let path = [];
    let cost = 0;
    let explored = [];
    while (queue.length > 0) {
        const current = queue.shift();
        if (visited[current.row][current.col]) continue;
        visited[current.row][current.col] = true;
        explored.push(current);
        if (current.row === end.row && current.col === end.col) {
            found = true;
            let node = current;
            while (node) {
                path.push({ row: node.row, col: node.col });
                node = node.parent;
            }
            path.reverse();
            cost = path.reduce((acc, n, i) => i === 0 ? acc : acc + cellWeights[n.row][n.col], 0);
            break;
        }
        for (const neighbor of neighbors(current)) {
            if (!visited[neighbor.row][neighbor.col]) {
                queue.push({
                    ...neighbor,
                    parent: current
                });
            }
        }
    }
    animatePath(explored, smoothPath(path));
    const t1 = performance.now();
    const infoDiv = document.getElementById('resultInfo');
    if (found) {
        infoDiv.textContent = `Cost: ${cost}, Time: ${(t1-t0).toFixed(2)} ms`;
    } else {
        infoDiv.textContent = 'No path found!';
    }
    updateStatisticsPanel({
        nodesExplored: explored.length,
        pathLength: path.length,
        pathCost: cost,
        timeTaken: (t1-t0).toFixed(2)
    });
}

function dfs() {
    const t0 = performance.now();
    const stack = [];
    stack.push({ ...start, parent: null });
    const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
    let found = false;
    let path = [];
    let cost = 0;
    let explored = [];
    while (stack.length > 0) {
        const current = stack.pop();
        if (visited[current.row][current.col]) continue;
        visited[current.row][current.col] = true;
        explored.push(current);
        if (current.row === end.row && current.col === end.col) {
            found = true;
            let node = current;
            while (node) {
                path.push({ row: node.row, col: node.col });
                node = node.parent;
            }
            path.reverse();
            cost = path.reduce((acc, n, i) => i === 0 ? acc : acc + cellWeights[n.row][n.col], 0);
            break;
        }
        for (const neighbor of neighbors(current)) {
            if (!visited[neighbor.row][neighbor.col]) {
                stack.push({
                    ...neighbor,
                    parent: current
                });
            }
        }
    }
    animatePath(explored, smoothPath(path));
    const t1 = performance.now();
    const infoDiv = document.getElementById('resultInfo');
    if (found) {
        infoDiv.textContent = `Cost: ${cost}, Time: ${(t1-t0).toFixed(2)} ms`;
    } else {
        infoDiv.textContent = 'No path found!';
    }
    updateStatisticsPanel({
        nodesExplored: explored.length,
        pathLength: path.length,
        pathCost: cost,
        timeTaken: (t1-t0).toFixed(2)
    });
}

let wallDrawingMode = false;
let wallRemovingMode = false;
let startPlacementMode = false;
let endPlacementMode = false;
let animationInterval = null;
let animationSpeed = 10;

function enableWallDrawing() {
    wallDrawingMode = true;
    wallRemovingMode = false;
    startPlacementMode = false;
    endPlacementMode = false;
    document.getElementById('resultInfo').textContent = 'Wall drawing mode: Click cells to add walls.';
}

function enableWallRemoving() {
    wallDrawingMode = false;
    wallRemovingMode = true;
    startPlacementMode = false;
    endPlacementMode = false;
    document.getElementById('resultInfo').textContent = 'Wall removing mode: Click cells to remove walls.';
}

function enableStartPlacement() {
    wallDrawingMode = false;
    wallRemovingMode = false;
    startPlacementMode = true;
    endPlacementMode = false;
    document.getElementById('resultInfo').textContent = 'Start placement mode: Click a cell to set start.';
}

function enableEndPlacement() {
    wallDrawingMode = false;
    wallRemovingMode = false;
    startPlacementMode = false;
    endPlacementMode = true;
    document.getElementById('resultInfo').textContent = 'Destination placement mode: Click a cell to set destination.';
}

canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (weightMode) {
        if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) return;
        cellWeights[row][col] = Math.min(cellWeights[row][col] + 1, 9);
        drawMaze();
        return;
    }
    if (wallDrawingMode) {
        // Prevent start/end from being walls
        if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) return;
        maze[row][col] = 1;
        drawMaze();
    } else if (wallRemovingMode) {
        // Prevent start/end from being removed
        if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) return;
        maze[row][col] = 0;
        drawMaze();
    } else if (startPlacementMode) {
        // Prevent placing start on wall or end
        if (maze[row][col] === 1 || (row === end.row && col === end.col)) return;
        start.row = row;
        start.col = col;
        drawMaze();
    } else if (endPlacementMode) {
        // Prevent placing end on wall or start
        if (maze[row][col] === 1 || (row === start.row && col === start.col)) return;
        end.row = row;
        end.col = col;
        drawMaze();
    }
});

canvas.addEventListener('contextmenu', function(e) {
    if (!weightMode) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if ((row === start.row && col === start.col) || (row === end.row && col === end.col)) return;
    cellWeights[row][col] = Math.max(cellWeights[row][col] - 1, 1);
    drawMaze();
});

function disableAllModes() {
    wallDrawingMode = false;
    wallRemovingMode = false;
    startPlacementMode = false;
    endPlacementMode = false;
    weightMode = false;
}

function updateStatisticsPanel(stats) {
    const statsContent = document.getElementById('statsContent');
    statsContent.innerHTML = `
        <div>Nodes Explored: ${stats.nodesExplored}</div>
        <div>Path Length: ${stats.pathLength}</div>
        <div>Path Cost: ${stats.pathCost}</div>
        <div>Time Taken: ${stats.timeTaken} ms</div>
    `;
}

let lastExplored = [];
let lastBestPath = [];

function animatePath(explored, bestPath) {
    lastExplored = explored;
    lastBestPath = bestPath;
    animationExplored = explored;
    animationBestPath = bestPath;
    animationStepIndex = 0;
    animationPaused = false;
    if (animationInterval) clearTimeout(animationInterval);
    if (bestPath.length === 0) {
        document.getElementById('resultInfo').textContent = 'No path found!';
        ctx.save();
        ctx.font = '32px Arial';
        ctx.fillStyle = 'red';
        ctx.fillText('No Path Found!', canvas.width/2 - 100, canvas.height/2);
        ctx.restore();
        return;
    }
    stepAnimation();
}

function replayPath() {
    if (lastExplored.length === 0 || lastBestPath.length === 0) return;
    animationExplored = lastExplored;
    animationBestPath = lastBestPath;
    animationStepIndex = 0;
    animationPaused = false;
    if (animationInterval) clearTimeout(animationInterval);
    stepAnimation();
}

function findPath() {
    const algo = algoSelect.value;
    if (algo === 'astar') {
        aStar();
    } else if (algo === 'dijkstra') {
        dijkstra();
    } else if (algo === 'bfs') {
        bfs();
    } else if (algo === 'dfs') {
        dfs();
    }
    disableAllModes();
}
window.findPath = findPath;
window.addRandomWalls = addRandomWalls;
window.resetMaze = resetMaze;
window.enableWallDrawing = enableWallDrawing;
window.enableWallRemoving = enableWallRemoving;
window.enableStartPlacement = enableStartPlacement;
window.enableEndPlacement = enableEndPlacement;
window.enableWeightMode = enableWeightMode;
// Already implemented above
window.replayPath = replayPath;
window.compareAlgorithms = function() {
    // Prepare fresh maze and weights for fair comparison
    function clone2D(arr) {
        return arr.map(row => row.slice());
    }
    const mazeBackup = clone2D(maze);
    const weightsBackup = clone2D(cellWeights);
    const startBackup = { ...start };
    const endBackup = { ...end };

    // List of algorithms to compare
    const algos = [
        { name: 'A*', fn: aStar },
        { name: 'Dijkstra', fn: dijkstra },
        { name: 'BFS', fn: bfs },
        { name: 'DFS', fn: dfs }
    ];
    const results = [];
    // Temporarily override animatePath to collect explored and path
    let origAnimatePath = animatePath;
    let origUpdateStats = updateStatisticsPanel;
    let origDrawMaze = drawMaze;
    let tempExplored = [], tempPath = [], tempStats = {};
    animatePath = function(explored, path) {
        tempExplored = explored;
        tempPath = path;
    };
    updateStatisticsPanel = function(stats) {
        tempStats = stats;
    };
    drawMaze = function(path){}; // Suppress drawing

    for (const algo of algos) {
        // Restore maze and weights for each run
        maze = clone2D(mazeBackup);
        cellWeights = clone2D(weightsBackup);
        start.row = startBackup.row;
        start.col = startBackup.col;
        end.row = endBackup.row;
        end.col = endBackup.col;
        // Run algorithm
        tempExplored = [];
        tempPath = [];
        tempStats = {};
        let t0 = performance.now();
        algo.fn();
        let t1 = performance.now();
        results.push({
            name: algo.name,
            explored: tempExplored,
            path: tempPath,
            stats: tempStats,
            time: (t1-t0).toFixed(2)
        });
    }
    // Restore original functions
    animatePath = origAnimatePath;
    updateStatisticsPanel = origUpdateStats;
    drawMaze = origDrawMaze;
    maze = clone2D(mazeBackup);
    cellWeights = clone2D(weightsBackup);
    start.row = startBackup.row;
    start.col = startBackup.col;
    end.row = endBackup.row;
    end.col = endBackup.col;
    drawMaze();

    // Show comparison panel
    document.getElementById('comparisonPanel').style.display = 'block';
    // Draw results on canvases
    function drawCompare(canvasId, explored, path, algoName, stats, time) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const cellSize = canvas.width / COLS;
        // Draw maze
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                if (mazeBackup[r][c] === 1) {
                    ctx.fillStyle = '#333';
                } else {
                    let w = weightsBackup[r][c];
                    ctx.fillStyle = `rgb(${255 - w * 20},${255 - w * 10},255)`;
                }
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#888';
                ctx.lineWidth = 1;
                ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
        // Draw explored
        ctx.fillStyle = '#b3e5fc';
        for (const node of explored) {
            if ((node.row === startBackup.row && node.col === startBackup.col) || (node.row === endBackup.row && node.col === endBackup.col)) continue;
            ctx.fillRect(node.col * cellSize, node.row * cellSize, cellSize, cellSize);
        }
        // Draw path
        ctx.fillStyle = 'yellow';
        for (const node of path) {
            if ((node.row === startBackup.row && node.col === startBackup.col) || (node.row === endBackup.row && node.col === endBackup.col)) continue;
            ctx.fillRect(node.col * cellSize, node.row * cellSize, cellSize, cellSize);
        }
        // Draw start/end
        ctx.fillStyle = '#007bff';
        ctx.fillRect(startBackup.col * cellSize, startBackup.row * cellSize, cellSize, cellSize);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(startBackup.col * cellSize, startBackup.row * cellSize, cellSize, cellSize);
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(endBackup.col * cellSize, endBackup.row * cellSize, cellSize, cellSize);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(endBackup.col * cellSize, endBackup.row * cellSize, cellSize, cellSize);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#333';
        // Draw stats
        ctx.save();
        ctx.font = '14px Arial';
        ctx.fillStyle = '#222';
        ctx.fillText(algoName, 10, canvas.height - 60);
        ctx.fillText(`Nodes: ${stats.nodesExplored || 0}`, 10, canvas.height - 44);
        ctx.fillText(`Length: ${stats.pathLength || 0}`, 10, canvas.height - 28);
        ctx.fillText(`Cost: ${stats.pathCost || 0}`, 10, canvas.height - 12);
        ctx.fillText(`Time: ${time} ms`, 120, canvas.height - 12);
        ctx.restore();
    }
    drawCompare('compareCanvasLeft', results[0].explored, results[0].path, results[0].name, results[0].stats, results[0].time);
    drawCompare('compareCanvasRight', results[1].explored, results[1].path, results[1].name, results[1].stats, results[1].time);
    // Optionally, show more results below
    let panel = document.getElementById('comparisonPanel');
    if (!document.getElementById('compareStatsTable')) {
        let table = document.createElement('table');
        table.id = 'compareStatsTable';
        table.style.marginTop = '16px';
        table.style.borderCollapse = 'collapse';
        table.innerHTML = `<tr style='background:#e3f2fd;'><th>Algorithm</th><th>Nodes Explored</th><th>Path Length</th><th>Path Cost</th><th>Time (ms)</th></tr>`;
        panel.appendChild(table);
    }
    let table = document.getElementById('compareStatsTable');
    table.innerHTML = `<tr style='background:#e3f2fd;'><th>Algorithm</th><th>Nodes Explored</th><th>Path Length</th><th>Path Cost</th><th>Time (ms)</th></tr>`;
    for (const r of results) {
        table.innerHTML += `<tr><td>${r.name}</td><td>${r.stats.nodesExplored || 0}</td><td>${r.stats.pathLength || 0}</td><td>${r.stats.pathCost || 0}</td><td>${r.time}</td></tr>`;
    }
};

function stepBackward() {
    animationPaused = true;
    if (animationStepIndex > 0) {
        animationStepIndex--;
        stepAnimation();
    }
}
window.stepBackward = stepBackward;

function playAnimation() {
    animationPaused = false;
    if (animationStepIndex < animationExplored.length) {
        stepAnimation();
    }
}
window.playAnimation = playAnimation;

function pauseAnimation() {
    animationPaused = true;
    if (animationInterval) clearTimeout(animationInterval);
}
window.pauseAnimation = pauseAnimation;

function stepForward() {
    animationPaused = true;
    if (animationStepIndex < animationExplored.length) {
        animationStepIndex++;
        stepAnimation();
    }
}
window.stepForward = stepForward;

function stepAnimation() {
    drawMaze();
    // Draw explored nodes
    ctx.fillStyle = '#b3e5fc';
    for (let j = 0; j < animationStepIndex; j++) {
        const node = animationExplored[j];
        if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) continue;
        ctx.fillRect(node.col * CELL_SIZE, node.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }
    if (animationStepIndex < animationExplored.length) {
        if (!animationPaused) {
            animationStepIndex++;
            animationInterval = setTimeout(stepAnimation, animationSpeed);
        }
    } else {
        // Draw best path
        ctx.fillStyle = 'yellow';
        for (const node of animationBestPath) {
            if ((node.row === start.row && node.col === start.col) || (node.row === end.row && node.col === end.col)) continue;
            ctx.fillRect(node.col * CELL_SIZE, node.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        }
        // Draw start and end distinctly
        ctx.fillStyle = '#007bff';
        ctx.fillRect(start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(start.col * CELL_SIZE, start.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = '#ff5722';
        ctx.fillRect(end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(end.col * CELL_SIZE, end.row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#333';
    }
}

const speedRange = document.getElementById('speedRange');
speedRange.addEventListener('input', function() {
    animationSpeed = parseInt(speedRange.value);
    document.getElementById('speedValue').textContent = animationSpeed;
    // If animation is running, restart with new speed
    if (!animationPaused && animationStepIndex < animationExplored.length) {
        if (animationInterval) clearTimeout(animationInterval);
        stepAnimation();
    }
});
