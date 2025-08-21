//// START CIRCOM LIB IMPORTS 

template Num2Bits(n) {
    signal input in;
    signal output out[n];
    var lc1=0;

    var e2=1;
    for (var i = 0; i<n; i++) {
        out[i] <-- (in >> i) & 1;
        out[i] * (out[i] -1 ) === 0;
        lc1 += out[i] * e2;
        e2 = e2+e2;
    }

    lc1 === in;
}

template LessThan(n) {
    assert(n <= 252);
    signal input in[2];
    signal output out;

    component n2b = Num2Bits(n+1);

    n2b.in <== in[0]+ (1<<n) - in[1];

    out <== 1-n2b.out[n];
}

template GreaterEqThan(n) {
    signal input in[2];
    signal output out;

    component lt = LessThan(n);

    lt.in[0] <== in[1];
    lt.in[1] <== in[0]+1;
    lt.out ==> out;
}

template XOR() {
    signal input a;
    signal input b;
    signal output out;

    out <== a + b - 2*a*b;
}

template IsZero() {
    signal input in;
    signal output out;

    signal inv;

    inv <-- in!=0 ? 1/in : 0;

    out <== -in*inv +1;
    in*out === 0;
}

//// END CIRCOM LIB IMPORTS

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

    signal xIsZero;
    component xIsZeroComp = IsZero();
    xIsZeroComp.in <== xDiff;
    xIsZeroComp.out ==> xIsZero;

    signal yIsZero;
    component yIsZeroComp = IsZero();
    yIsZeroComp.in <== yDiff;
    yIsZeroComp.out ==> yIsZero;

    component xor = XOR();
    xor.a <== xIsZero;
    xor.b <== yIsZero;

    signal result;
    xor.out ==> result;

    result === 1;

    // Dx = x1 - x0, Dx == 0 OR Dx == 1 OR Dx == -1
    // Dy = y1 - y0, Dy == 0 OR Dy == 1 OR Dy == -1

    // -2 < Dx < 2
    // -2 < Dx < 2
}


template ValidateTransition() {
    signal input newPos[2];
    signal input oldBoard[9];
    signal input newBoard[9];
    oldBoard[newPos[0] + 3 * newPos[1]] + 1 === newBoard[newPos[0] + 3 * newPos[1]];
}

component main = ValidateMovement();
