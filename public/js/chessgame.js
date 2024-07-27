
function attachBeforeUnloadListener() {
    window.addEventListener('beforeunload', function (e) {
        // Cancel the event
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave this page?'; // For Chrome, Firefox, Safari
        return 'Are you sure you want to leave this page?'; // For older browsers
    });
}

// Attach the beforeunload listener initially
attachBeforeUnloadListener();

// Ensure reattachment of the listener in strategic places
document.querySelector('.chessboard').addEventListener('click', function () {
    attachBeforeUnloadListener();
});
const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const playerRoleElement = document.getElementById("player-role");


let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

const renderBoard = () => {
    const board = chess.board();
    boardElement.innerHTML = "";
    board.forEach((row, rowindex) => {
        row.forEach((square, squareindex) => {
            const squareElement = document.createElement("div");
            squareElement.classList.add("square", (rowindex + squareindex) % 2 === 0 ? "light" : "dark");

            squareElement.dataset.row = rowindex;
            squareElement.dataset.col = squareindex;

            if (square) {
                const pieceElement = document.createElement("div");
                pieceElement.classList.add("piece", square.color === "w" ? "white" : "black");
                pieceElement.innerText = getPieceUnicode(square);
                pieceElement.draggable = playerRole === square.color;

               // Mouse events
               pieceElement.addEventListener("dragstart", handleDragStart);
               pieceElement.addEventListener("dragend", handleDragEnd);

                // Touch events
                pieceElement.addEventListener("touchstart", handleTouchStart);
                pieceElement.addEventListener("touchend", handleTouchEnd);

                squareElement.appendChild(pieceElement);
            }

            squareElement.addEventListener("dragover", handleDragOver);
            squareElement.addEventListener("drop", function (e) {
                e.preventDefault();
                if (draggedPiece) {
                    const targetSquare = {
                        row: parseInt(squareElement.dataset.row),
                        col: parseInt(squareElement.dataset.col)
                    };
                   
                    handleMove(sourceSquare, targetSquare);
                }
            });

            // Touch events
            squareElement.addEventListener("touchmove", handleTouchMove);

            boardElement.appendChild(squareElement);
        });
    });

    if (playerRole === 'b') {
        boardElement.classList.add("flipped");
    } else {
        boardElement.classList.remove("flipped");
    }
     // Update the turn indicator
     updateTurnIndicator();
     updatePlayerRole();
};

const handleMove = (source, target) => {

    const fromCol = String.fromCharCode(97 + source.col);
    const fromRow = 8 - source.row;
    const toCol = String.fromCharCode(97 + target.col);
    const toRow = 8 - target.row;

    if (isNaN(source.col) || isNaN(source.row) || isNaN(target.col) || isNaN(target.row)) {
        return;
    }

    const move = {
        from: `${fromCol}${fromRow}`,
        to: `${toCol}${toRow}`,
        promotion: "q"
    };

    socket.emit("move", move);
};

const getPieceUnicode = (piece) => {
    const unicodePieces = {
        p: "♟",
        r: "♜",
        n: "♞",
        b: "♝",
        q: "♛",
        k: "♚",
        p: "♙",
        R: "♖",
        N: "♘",
        B: "♗",
        Q: "♕",
        K: "♔",
    };
    return unicodePieces[piece.type] || "";
};

const handleDragStart = (e) => {
    if (e.target.draggable) {
        draggedPiece = e.target;
        sourceSquare = {
            row: parseInt(e.target.parentElement.dataset.row),
            col: parseInt(e.target.parentElement.dataset.col)
        };
        e.dataTransfer.setData("text/plain", "");
    }
};

const handleDragEnd = (e) => {
    draggedPiece = null;
    sourceSquare = null;
};

const handleDragOver = (e) => {
    e.preventDefault();
};

const handleDrop = (e) => {
    e.preventDefault();
    if (draggedPiece) {
        const targetSquare = {
            row: parseInt(e.target.dataset.row),
            col: parseInt(e.target.dataset.col)
        };
        handleMove(sourceSquare, targetSquare);
    }
};

const handleTouchStart = (e) => {
    const touch = e.touches[0];
    draggedPiece = e.target;
    sourceSquare = {
        row: parseInt(e.target.parentElement.dataset.row),
        col: parseInt(e.target.parentElement.dataset.col)
    };
    e.target.style.position = 'absolute';
    e.target.style.zIndex = 1000;
    moveAt(touch.pageX, touch.pageY);
};

const handleTouchMove = (e) => {
    const touch = e.touches[0];
    e.preventDefault(); // Prevent scrolling
    moveAt(touch.pageX, touch.pageY);
};

const handleTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const targetSquare = document.elementFromPoint(touch.clientX, touch.clientY).parentElement;

    if (targetSquare.classList.contains("square")) {
        const targetPosition = {
            row: parseInt(targetSquare.dataset.row),
            col: parseInt(targetSquare.dataset.col)
        };
        handleMove(sourceSquare, targetPosition);
    }

    draggedPiece.style.position = '';
    draggedPiece.style.zIndex = '';
    draggedPiece = null;
    sourceSquare = null;
};

const moveAt = (pageX, pageY) => {
    draggedPiece.style.left = pageX - draggedPiece.offsetWidth / 2 + 'px';
    draggedPiece.style.top = pageY - draggedPiece.offsetHeight / 2 + 'px';
};

const updateTurnIndicator = () => {
    const turnIndicator = document.getElementById('turn-indicator');
    if (chess.turn() === 'w') {
        turnIndicator.textContent = "White's Turn";
        turnIndicator.className = 'turn-indicator white-turn';
    } else {
        turnIndicator.textContent = "Black's Turn";
        turnIndicator.className = 'turn-indicator black-turn';
    }
};

const updatePlayerRole = () => {
    playerRoleElement.className = 'player-role';
    if (playerRole === 'w') {
        playerRoleElement.textContent = "You are playing as White";
        playerRoleElement.classList.add("white-role");
    } else if (playerRole === 'b') {
        playerRoleElement.textContent = "You are playing as Black";
        playerRoleElement.classList.add("black-role");
    } else {
        playerRoleElement.textContent = "You are a Spectator";
        playerRoleElement.classList.add("spectator-role");
    }
};

// Ensure playerRole is set before rendering the board
socket.on("playerRole", function (role) {
   
    playerRole = role;
    updatePlayerRole();
    renderBoard();
});

socket.on("spectatorRole", function () {
   
    playerRole = null;
    updatePlayerRole();
    renderBoard();
});

socket.on("boardState", function (fen) {
    
    chess.load(fen);
    // if (playerRole !== null) {
        renderBoard();
   // }
});

socket.on("move", function (move) {
    
    chess.move(move);
    if (playerRole !== null) {
        renderBoard();
    }
});

socket.on("invalidMove",function(){
   
    alert("Invalid Move");
});

socket.on("notYourTurn",function(){
    alert("Not Your Turn");
});



renderBoard();