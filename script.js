const rawMaze = document.getElementById("raw-maze");
const mazeForm = document.getElementById("maze-form");
const mazeContainer = document.getElementById("maze");
const nextStepBtn = document.getElementById("next-step");
const frog = document.createElement('i');
frog.setAttribute("class", "fa-solid fa-frog fa-bounce frog");
const fly = document.createElement('i');
fly.setAttribute('class', "fa-solid fa-mosquito fa-shake fly");

let pathArr = [];
let stepCtr = 1;


mazeForm.onsubmit = (e) => {
    e.preventDefault();
    // Reset global var
    mazeContainer.className = "";
    pathArr.length = 0;
    stepCtr = 1;

    try {
        const maze = new Maze(rawMaze.value);
        maze.solve();
        pathArr = maze.createMazeGrids(mazeContainer);

        if (!document.getElementById("stepwise").checked) {
            mazeContainer.className = "result";
            // setTimeout(() => pathArr[pathArr.length-1].replaceChildren(frog), 1000);

            // for A*
            for (let i = 1; i < pathArr.length; ++i) {
                pathArr[i].innerText = `${pathArr[i].getAttribute('step')} + ${pathArr[i].innerText}`;
            }
        }
        

    } catch (error) {
        alert(error);
        return;
    }

}

nextStepBtn.onclick = (e) => {
    const cell = pathArr[stepCtr++];
    cell.classList.add("step-path");
    cell.innerText += `+${cell.getAttribute('step')}`;
    // cell.replaceChildren(frog);

    if (stepCtr === pathArr.length) mazeContainer.className = "result";
}

function areSameStates(state1, state2) {
    return state1.row == state2.row && state1.col == state2.col;
};

function heuristicManhattan(state, goal) {
    return Math.abs(goal.row - state.row) + Math.abs(goal.col - state.col);
}

class GeneralSet extends Set {
    hasState (state) {
        return ([...this].some (
            cell => areSameStates(cell, state)
        ));
    }

    getIndexofState(state) {
        let arr = [...this];
        for (let i in arr) {
            if (areSameStates(arr[i], state)) return +i;
        }
        return -1;
    }
}

class Node {
    constructor (state, parent=null, action=null) {
        this.state = state;
        this.parent = parent;
        this.action = action;
    }
};

class StackFrontier {
    constructor () {
        this.frontier = [];
    }

    add (node) {
        this.frontier.push(node);
    }

    hasState (state) {
        return this.frontier.some(
            node => areSameStates(node, state)
        );
    }

    isEmpty () {
        return this.frontier.length === 0;
    }

    remove () {
        if (this.isEmpty()) throw new Error("Frontier already Empty");
        else return this.frontier.pop();
    }
};

class QueueFrontier extends StackFrontier {
    remove() {
        if (this.isEmpty()) {
            throw new Error("Frontier ALredy Empty!");
            return;
        }
        return this.frontier.shift();
    }
}

class PriorityQueueFrontier extends QueueFrontier {
    // Lowest priority first
    add (node, priority) {
        if (this.frontier.length === 0) {
            this.frontier.push({priority, val: node});
            return;
        }
        for (let i = this.frontier.length - 1; i >= 0; --i) {
            if (priority <= this.frontier[i].priority) {
                this.frontier[i+1] = this.frontier[i];

                if(i === 0) this.frontier[0] = {priority, val: node};
            }
            else this.frontier[i+1] = {priority, val: node};
        }
    }

    hasState (state) {
        return this.frontier.some(
            node => areSameStates(node.val, state)
        );
    }
}

class AStarPriorityQueueFrontier extends PriorityQueueFrontier {
    add(node, priority, step = 0) {
        if (this.frontier.length === 0) {
            this.frontier.push({priority, val: node, step});
            return;
        }
        for (let i = this.frontier.length - 1; i >= 0; --i) {
            if (priority + step <= this.frontier[i].priority + this.frontier[i].step) {
                this.frontier[i+1] = this.frontier[i];

                if(i === 0) this.frontier[0] = {priority, val: node, step};
            }
            else this.frontier[i+1] = {priority, val: node, step};
        }
    }
}

class Maze {
    constructor (pattern) {
        if (pattern.split('A').length - 1 !== 1) throw new Error("Maze must contain exactly one starting point!");
        if (pattern.split('B').length - 1 !== 1) throw new Error("Maze must contain exactly one goal point!");

        // Split at new line
        let mazeRow = pattern.split('\n');

        // Set maze height
        this.height = mazeRow.length;
        // Set Maze width
        this.width = mazeRow.reduce(
            (maxCol, col) => maxCol > col.length ? maxCol : col.length, 0,
        );

        // Keep count of walls
        this.walls = [];

        for (let row = 0; row < this.height; ++row) {
            const rowArr = [];
            for (let col = 0; col < this.width; ++col) {
                if (col < mazeRow[row].length) {
                    switch (mazeRow[row][col]) {
                        case ' ':
                            rowArr.push(false);
                            break;
                        
                        case 'A':
                            this.source = {row, col};
                            rowArr.push(false);
                            break;
                        
                        case 'B':
                            this.goal = {row, col};
                            rowArr.push(false);
                            break;
                        
                        default:
                            rowArr.push(true);
                            break;
                    }
                }
                else rowArr.push(false);

            }
            this.walls.push(rowArr);
        }

        this.solution = null;
    }

    neighbors (state) {
        const {row, col} = state;

        const members = [
            {
                action: "up",
                state: {
                    row : row - 1,
                    col : col
                }
            },
            {
                action: "down",
                state: {
                    row : row + 1,
                    col : col
                }
            },
            {
                action: "left",
                state: {
                    row : row,
                    col : col - 1
                }
            },
            {
                action: "right",
                state: {
                    row : row,
                    col : col + 1
                }
            }
        ]

        const result = [];

        for (let each of members) {
            const {row, col} = each.state;
            if (row >= 0 && row < this.height && col >= 0 && col < this.width && !this.walls[row][col]) {
                result.push(each);
            }
        }
        return result;
    }

    solve () {
        // Keep track of number of states explored
        this.numExplored = 0;
        // Initialize an empty explored set
        this.explored = new GeneralSet();

        //For A*
        this.steps = new Array(this.height).fill(0).map(() => new Array(this.width).fill(0));

        // Initialize frontier to just the starting position
        const source = new Node(this.source);
        const frontier = new AStarPriorityQueueFrontier();
        frontier.add(source, heuristicManhattan(source.state, this.goal));


        // Keep looping until solution found
        while (true) {
            // If nothing left in frontier, then no path
            if (frontier.isEmpty()) throw new Error("No Solution");

            // Choose a node from the frontier
            
            let node = frontier.remove();
            // A*
            const stepsTaken = node.step + 1;
            // Changed to .val for heuristic
            node = node.val;

            // A*
            this.steps[node.state.row][node.state.col] = stepsTaken - 1;

            this.numExplored += 1;

            // Mark node as explored
            this.explored.add(node.state);

            // If Node is goal, we found the solution
            if (areSameStates(node.state, this.goal)) {
                const actions = [], cells = [];
                while (node.parent) {
                    actions.push(node.action);
                    cells.push(node.state);
                    node = node.parent;
                }
                actions.reverse();
                cells.reverse();
                this.solution = {actions, cells};

                return;
            }

            // Add neighbors to frontier
            for (const neighbor of this.neighbors(node.state)) {
                const {state, action} = neighbor;
                if (!frontier.hasState(state) &&
                    !(this.explored.hasState(state))
                    ) {
                    const child = new Node(state, node, action);
                    // change for heuristic
                    frontier.add(child, heuristicManhattan(state, this.goal), stepsTaken);
                }
            }

        }
    }

    createMazeGrids (mazeCont) {
        //Remove previous Grids

        const setMazeDimensions = () => {
            // min(960px, 80vh, 90vw); for max
            const max = Math.min(window.screen.height*8/10, window.screen.width*9/10, 960);
            if (this.height > this.width) {
                mazeCont.style.width = max * (this.width / this.height) + 'px';
                mazeCont.style.height = max + 'px';
            }
            else {
                mazeCont.style.height = max * (this.height / this.width) + 'px';
                mazeCont.style.width = max + 'px';
            }
        }

        setMazeDimensions();

        mazeCont.replaceChildren();

        const pathArr = [];
    
        for (let row in this.walls) {
            const gridRow = document.createElement('div');
            gridRow.setAttribute("class", "grid-row");
            
            for (let col in this.walls[row]) {

                const gridCell = document.createElement('div');

                // If heuristic
                if(!this.walls[row][col])
                    gridCell.innerText = heuristicManhattan({row: +row, col: +col}, this.goal);

                let className = "grid-cell";

                if (this.walls[row][col]) className += " wall";
                else if (areSameStates(this.source, {row, col})) {
                    className += " source";
                    // gridCell.replaceChildren(frog);
                }
                else if (areSameStates(this.goal, {row, col})) {
                    className += " goal";
                    // gridCell.replaceChildren(fly);
                }

                if (
                    this.solution && 
                    this.solution.cells.some(
                        cell => areSameStates(cell, {row, col})
                        )
                    ) className += " solution";
                if (
                    this.solution &&
                    this.explored.hasState({row: +row, col: +col})
                    ) {
                        gridCell.setAttribute("path-count", this.explored.getIndexofState({row: +row, col: +col}));
                        pathArr[this.explored.getIndexofState({row: +row, col: +col})] = gridCell;
                        className += " path";

                        // A*
                        if (this.steps[row][col])
                            gridCell.setAttribute("step", this.steps[row][col])
                    }

                gridCell.setAttribute("class", className);

                gridRow.appendChild(gridCell);
            }
            mazeCont.appendChild(gridRow);
        }
        return pathArr;
    }
};