import chai, { expect } from "chai";
import chaiTruffle from "../../lib/chai-truffle";
import { assertPromiseShouldReject } from "../assert-util";

const TestContract: TestContract = artifacts.require("Test");

chai.use(chaiTruffle);

describe(".not.evmOutOfGas()", () => {
  it("should pass when the call succeeds in EVM", async () => {
    const contractInstance = await TestContract.new();
    return expect(contractInstance.doNothing()).not.to.evmOutOfGas();
  });

  it("should pass when the call gets reverted in EVM but not because of out of gas", async () => {
    const contractInstance = await TestContract.new();
    return expect(contractInstance.revertImmediately()).not.to.evmOutOfGas();
  });

  it("should not pass when the call runs out of gas in EVM", async () => {
    const contractInstance = await TestContract.new();
    return assertPromiseShouldReject(
      expect(contractInstance.drainGas({
        gas: 30000,
      })).not.to.evmOutOfGas(),
      "expected transaction not to fail in EVM because of out of gas, but it was",
    );
  });
});

describe(".evmOutOfGas()", () => {
  it("should not pass when the call succeeds in EVM", async () => {
    const contractInstance = await TestContract.new();
    return assertPromiseShouldReject(
      expect(contractInstance.doNothing()).to.evmOutOfGas(),
      "expected transaction to fail in EVM because of out of gas, but it succeeded",
    );
  });

  it("should not pass when the call gets reverted in EVM but not because of out of gas", async () => {
    const contractInstance = await TestContract.new();
    return assertPromiseShouldReject(
      expect(contractInstance.revertImmediately()).to.evmOutOfGas(),
      "expected transaction to fail in EVM because of out of gas, but it failed of another reason",
    );
  });

  it("should pass when the call runs out of gas in EVM", async () => {
    const contractInstance = await TestContract.new();
    return expect(contractInstance.drainGas({
      gas: 30000,
    })).to.evmOutOfGas();
  });
});
