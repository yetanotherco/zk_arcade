include "node_modules/circomlib/circuits/bitify.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/gates.circom";

// Validates that all positions of the board are all the same on the final round
template ValidateFinalRound() {
    signal input board[9];

    for(var i = 1; i < 9; i++){
        board[i] === board[0];
    }
}

// Validates that the user position fit the map coordinates
template ValidPos() {
    signal input pos[2];

    // Check that the x coordinate is lower than 3
    signal xLowerThan3;

    signal xLessThanInput[2];
    xLessThanInput[0] <-- pos[0];
    xLessThanInput[1] <-- 3;

    // 3 bits are enough to represent 0,1,2,3 and 4
    component xLessThan = LessThan(3);

    xLessThan.in <== xLessThanInput;
    xLessThan.out ==> xLowerThan3;
    xLowerThan3 === 1;
    
    // Check that the y coordinate is lower than 3
    signal yLowerThan3;

    signal yLessThanInput[2];
    yLessThanInput[0] <-- pos[1];
    yLessThanInput[1] <-- 3;

    // 3 bits are enough to represent 0,1,2,3 and 4
    component yLessThan = LessThan(3);

    yLessThan.in <== yLessThanInput;
    yLessThan.out ==> yLowerThan3;
    yLowerThan3 === 1;

    // Check that the x coordinate is bigger than 0
    signal xBiggerThan0;

    signal xGreaterThanInput[2];
    xGreaterThanInput[0] <-- pos[0];
    xGreaterThanInput[1] <-- 0;

    // 3 bits are enough to represent 0,1,2,3 and 4
    component xGreaterThan = GreaterEqThan(3);

    xGreaterThan.in <== xGreaterThanInput;
    xGreaterThan.out ==> xBiggerThan0;
    xBiggerThan0 === 1;
    
    // Check that the y coordinate is bigger than 0
    signal yBiggerThan0;

    signal yGreaterThanInput[2];
    yGreaterThanInput[0] <-- pos[1];
    yGreaterThanInput[1] <-- 0;

    // 3 bits are enough to represent 0,1,2,3 and 4
    component yGreaterThan = GreaterEqThan(3);

    yGreaterThan.in <== yGreaterThanInput;
    yGreaterThan.out ==> yBiggerThan0;
    yBiggerThan0 === 1;
}

// Validates the user movement between rounds
template ValidateMovement() {
    signal input oldPos[2];
    signal input newPos[2];

    signal xDiff <== (newPos[0] - oldPos[0]);
    signal yDiff <== newPos[1] - oldPos[1];

    // Check that -2 < xDiff < 2 (i.e., xDiff is in {-1, 0, 1})
    // Convert to unsigned by adding 2: xDiff + 2 should be in {1, 2, 3}
    signal xDiffUnsigned <== xDiff + 2;
    
    // Check xDiffUnsigned >= 1 (xDiff >= -1)
    component xGreaterEq1 = GreaterEqThan(3);
    xGreaterEq1.in[0] <== xDiffUnsigned;
    xGreaterEq1.in[1] <== 1;
    xGreaterEq1.out === 1;
    
    // Check xDiffUnsigned < 4 (xDiff < 2)
    component xLessThan4 = LessThan(3);
    xLessThan4.in[0] <== xDiffUnsigned;
    xLessThan4.in[1] <== 4;
    xLessThan4.out === 1;

    // Check that -2 < yDiff < 2 (i.e., yDiff is in {-1, 0, 1})
    // Convert to unsigned by adding 2: yDiff + 2 should be in {1, 2, 3}
    signal yDiffUnsigned <== yDiff + 2;
    
    // Check yDiffUnsigned >= 1 (yDiff >= -1)
    component yGreaterEq1 = GreaterEqThan(3);
    yGreaterEq1.in[0] <== yDiffUnsigned;
    yGreaterEq1.in[1] <== 1;
    yGreaterEq1.out === 1;
    
    // Check yDiffUnsigned < 4 (yDiff < 2)
    component yLessThan4 = LessThan(3);
    yLessThan4.in[0] <== yDiffUnsigned;
    yLessThan4.in[1] <== 4;
    yLessThan4.out === 1;

    // Ensure no diagonal movement: xDiff * yDiff === 0
    // This means either xDiff is 0 OR yDiff is 0 (or both)
    xDiff * yDiff === 0;
}


template ValidateTransition() {
    signal input oldPos[2];
    signal input newPos[2];
    signal input oldBoard[9];
    signal input newBoard[9];

    // Calculate if the user has moved and the user's board index
    signal dx <== newPos[0] - oldPos[0];
    signal dy <== newPos[1] - oldPos[1];

    component isDxZero = IsZero();
    isDxZero.in <== dx;
    component isDyZero = IsZero();
    isDyZero.in <== dy;

    signal moved <== 1 - isDxZero.out * isDyZero.out;

    signal boardIndex <== newPos[0] + 3 * newPos[1];

    component isUserPosition[9];
    for (var i = 0; i < 9; i++) {
        isUserPosition[i] = IsZero();
        isUserPosition[i].in <== boardIndex - i;

        // This means the cell should be the same excepting the user new position, which
        // should be the previous value + 1 in case there has been a movement
        newBoard[i] === oldBoard[i] + moved * isUserPosition[i].out;
    }
}

template ValidateParityLevel(MAX_ROUNDS) {
    signal input levelBoards[MAX_ROUNDS][9];
    signal input userPositions[MAX_ROUNDS][2];

    component positionValidation[MAX_ROUNDS];
    for (var i = 0; i < MAX_ROUNDS; i++) {
        positionValidation[i] = ValidPos();
        positionValidation[i].pos <== userPositions[i];
    }
    
    component movementValidation[MAX_ROUNDS-1];
    for (var i = 0; i < MAX_ROUNDS-1; i++) {
        movementValidation[i] = ValidateMovement();
        movementValidation[i].oldPos <== userPositions[i];
        movementValidation[i].newPos <== userPositions[i+1];
    }
    
    component transitionValidation[MAX_ROUNDS-1];
    for (var i = 0; i < MAX_ROUNDS-1; i++) {
        transitionValidation[i] = ValidateTransition();
        transitionValidation[i].oldPos <== userPositions[i];
        transitionValidation[i].newPos <== userPositions[i+1];
        transitionValidation[i].oldBoard <== levelBoards[i];
        transitionValidation[i].newBoard <== levelBoards[i+1];
    }
    
    component finalRoundValidation = ValidateFinalRound();
    finalRoundValidation.board <== levelBoards[MAX_ROUNDS-1];
}

template ValidateParityGame(MAX_LEVELS, MAX_ROUNDS) {
    signal input userAddress;
    signal input levelsBoards[MAX_LEVELS][MAX_ROUNDS][9];
    signal input userPositions[MAX_LEVELS][MAX_ROUNDS][2];
    signal output max_level_completed;
    signal output gameConfigPacked;

    component levelsValidation[MAX_LEVELS];

    var acc = 0;
    var byteIdx = 0;

    var level_completed_sum = 0;
    component level_completed[MAX_LEVELS];

    for (var i = 0; i < MAX_LEVELS; i++) {
        levelsValidation[i] = ValidateParityLevel(MAX_ROUNDS);
        levelsValidation[i].levelBoards <== levelsBoards[i];
        levelsValidation[i].userPositions <== userPositions[i];

        // If the board sum equals 0, then a zero board was passed
        // Which means the user has not completed the game
        var board_sum = 0;
        for (var k = 0; k < 9; k++) {
            board_sum = board_sum + levelsBoards[i][0][k];
        }
        level_completed[i] = IsZero();
        level_completed[i].in <-- board_sum;

        level_completed_sum = level_completed_sum + 1 - level_completed[i].out;

        var posByte = ((userPositions[i][0][0] & 0x0F) << 4) | (userPositions[i][0][1] & 0x0F);
        acc = (acc << 8) + posByte;

        for (var j = 0; j < 9; j++) {
            var b = levelsBoards[i][0][j] & 0xFF;
            acc = (acc << 8) + b;
        }
    }

    max_level_completed <== level_completed_sum;
    gameConfigPacked <-- acc;
}

component main {public [userAddress]}  = ValidateParityGame(3, 55);
