.PHONY: all compile ptau setup vkey artifacts fullprove clean

PUB_DIR      := public/artifacts
PTAU_POW     := 12

all: compile ptau setup vkey artifacts

compile:
	mkdir -p build
	circom fibonacci.circom --r1cs --wasm --prime bn128 -o build
	snarkjs r1cs info build/fibonacci.r1cs

ptau:
	snarkjs powersoftau new bn128 $(PTAU_POW) pot$(PTAU_POW)_0000.ptau -v
	snarkjs powersoftau contribute pot$(PTAU_POW)_0000.ptau pot$(PTAU_POW)_0001.ptau -v
	snarkjs powersoftau prepare phase2 pot$(PTAU_POW)_0001.ptau pot$(PTAU_POW)_final.ptau -v

setup:
	snarkjs groth16 setup build/fibonacci.r1cs pot$(PTAU_POW)_final.ptau fibonacci_0000.zkey
	snarkjs zkey contribute fibonacci_0000.zkey fibonacci_final.zkey -v

vkey:
	mkdir -p $(PUB_DIR)
	snarkjs zkey export verificationkey fibonacci_final.zkey $(PUB_DIR)/verification_key.json

artifacts:
	mkdir -p $(PUB_DIR)
	cp build/fibonacci_js/fibonacci.wasm $(PUB_DIR)/fibonacci.wasm
	cp fibonacci_final.zkey $(PUB_DIR)/fibonacci_final.zkey

fullprove:
	echo '{ "a0":"0", "a1":"1" }' > input.json
	snarkjs groth16 fullprove input.json build/fibonacci_js/fibonacci.wasm fibonacci_final.zkey proof.json public.json
	snarkjs groth16 verify $(PUB_DIR)/verification_key.json public.json proof.json

clean:
	rm -rf build *.zkey *.ptau input.json proof.json public.json
