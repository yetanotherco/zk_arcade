pragma circom 2.1.6;

template Fibonacci(K) {
    signal input a0;
    signal input a1;
    signal output out;

    signal seq[K+1];

    seq[0] <== a0;
    seq[1] <== a1;

    for (var i = 2; i <= K; i++) {
        seq[i] <== seq[i-1] + seq[i-2];
    }

    out <== seq[K];
}

component main = Fibonacci(20);
