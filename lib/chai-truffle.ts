/// <reference types="../index" />
/// <reference types="../typings/chai" />
/// <reference types="../typings/truffle" />

import { isNil } from "./utils";

export = (chai: any, utils: ChaiUse.Utils): void => {
  const Assertion: any = chai.Assertion;

  const property = (
    name: string,
    assertFn: (this: ChaiUse.Assertion) => Chai.Assertion,
  ) => {
    Assertion.addProperty(name, assertFn);
  };

  const method = (
    name: string,
    assertFn: (this: ChaiUse.Assertion, ...args: any) => Chai.Assertion,
  ) => {
    Assertion.addMethod(name, assertFn);
  };

  method("emitEvent", function(
    this: ChaiUse.Assertion,
    expectedEventName?: string,
  ) {
    if (isNil(expectedEventName)) {
      return assertHasEventEmittedWithAssertion(this);
    }
    new Assertion(this._obj).to.be.transactionResponse;

    const obj: Truffle.TransactionResponse = this._obj;
    const matchedEventLogIndexList = obj.logs
      .filter((log) => !isNil(log.event) && log.event === expectedEventName)
      .map((log) => log.logIndex);
    const hasMatchedEvent = matchedEventLogIndexList.length !== 0;

    this.assert(
      hasMatchedEvent,
      `expected transaction to emit event ${expectedEventName}, but was not emitted`,
      `expected transaction not to emit event ${expectedEventName}, but was emitted`,
    );

    setEmitEventLogPositionList(this, matchedEventLogIndexList);
    updateNegatedBeforeAssertEmitEvent(this);

    return this;
  });

  const assertHasEventEmittedWithAssertion = (
    assertion: ChaiUse.Assertion,
  ): ChaiUse.Assertion => {
    new Assertion(assertion._obj).to.be.transactionResponse;

    const obj: Truffle.TransactionResponse = assertion._obj;
    const logWithEventFound = obj.logs.find((log) => !isNil(log.event));
    const hasEventEmitted = !!logWithEventFound;
    const eventEmitted =
      hasEventEmitted && (logWithEventFound as Truffle.TransactionLog).event;

    assertion.assert(
      hasEventEmitted,
      "expected transaction to emit event, but none was emitted",
      `expected transaction not to emit event, but event ${eventEmitted} was emitted`,
    );

    return assertion;
  };

  method("emitEventAt", function(
    this: ChaiUse.Assertion,
    expectedEventName: string,
    position: number,
  ) {
    const objAssertion = new Assertion(this._obj);
    objAssertion.to.be.transactionResponse;

    const obj: Truffle.TransactionResponse = this._obj;

    const objLogSize = obj.logs.length;
    const positionOutOfLogsSize = position > objLogSize - 1;
    if (positionOutOfLogsSize) {
      if (isNegated(this)) {
        return this;
      }
      throw new Error(
        `expected transaction to emit event ${expectedEventName} at position ${position}, but only ${objLogSize} event(s) was emitted`,
      );
    }
    const eventAtTargetPosition = obj.logs[position].event;
    const hasTargetEventEmittedAtPosition =
      eventAtTargetPosition === expectedEventName;

    this.assert(
      hasTargetEventEmittedAtPosition,
      `expected transaction to emit event ${expectedEventName} at position ${position}, but ${eventAtTargetPosition} was emitted`,
      `expected transaction not to emit event ${expectedEventName} at position ${position}, but was emitted`,
    );

    setEmitEventLogPositionList(this, [position]);
    updateNegatedBeforeAssertEmitEvent(this);

    return this;
  });

  method("emitEventWithArgs", function(
    this: ChaiUse.Assertion,
    expectedEventName: string,
    assertArgsFn: AssertArgsFn,
  ) {
    new Assertion(this._obj).to.be.transactionResponse;

    const obj: Truffle.TransactionResponse = this._obj;

    const matchedEventLogs = obj.logs.filter(
      (log) => !isNil(log) && log.event === expectedEventName,
    );

    const hasMatchedEventLogs = matchedEventLogs.length !== 0;
    if (!hasMatchedEventLogs) {
      failAssertion(
        this,
        `expected transaction to emit event ${expectedEventName} with matching argument(s), but was not emitted`,
      );
      return this;
    }

    const errorMessagePrefix = `expected transaction to emit event ${expectedEventName} with matching argument(s)`;
    const negatedErrorMessage = `expected transaction not to emit event ${expectedEventName} with matching argument(s), but was emitted`;
    assertEventArgsFromMatchedEventLogsWithAssertion(
      this,
      matchedEventLogs,
      assertArgsFn,
      errorMessagePrefix,
      negatedErrorMessage,
    );

    return this;
  });

  method("emitEventWithArgsAt", function(
    this: ChaiUse.Assertion,
    expectedEventName: string,
    assertArgsFn: AssertArgsFn,
    position: number,
  ) {
    new Assertion(this._obj).to.be.transactionResponse;
    const obj: Truffle.TransactionResponse = this._obj;

    const objLogSize = obj.logs.length;
    const isPositionOutOfLogsSize = position > obj.logs.length - 1;
    if (isPositionOutOfLogsSize) {
      if (isNegated(this)) {
        return this;
      }
      throw new Error(
        `expected transaction to emit event ${expectedEventName} at position ${position}, but only ${objLogSize} event(s) are emitted`,
      );
    }

    const targetEventLog = obj.logs[position];

    if (targetEventLog.event !== expectedEventName) {
      failAssertion(
        this,
        `expected transaction to emit event ${expectedEventName} at position ${position} with matching argument(s), but was not emitted`,
      );
      return this;
    }

    const errorMessagePrefix = `expected transaction to emit event ${expectedEventName} at position ${position} with matching argument(s)`;
    const negatedErrorMessage = `expected transaction not to emit event ${expectedEventName} at position ${position} with matching argument(s), but was emitted`;
    assertEventArgsFromMatchedEventLogsWithAssertion(
      this,
      [targetEventLog],
      assertArgsFn,
      errorMessagePrefix,
      negatedErrorMessage,
    );

    return this;
  });

  method("eventLength", eventLengthAssertFn);
  method("eventLengthOf", eventLengthAssertFn);

  function eventLengthAssertFn(
    this: ChaiUse.Assertion,
    expectedLength: number,
  ): ChaiUse.Assertion {
    assertIsTransactionResponse(this._obj);

    const actualEventLogLength = (this._obj as Truffle.TransactionResponse).logs
      .length;
    this.assert(
      actualEventLogLength === expectedLength,
      `expected transaction to emit ${expectedLength} event log(s), but ${actualEventLogLength} was emitted`,
      `expected transaction not to emit ${expectedLength} event log(s)`,
      expectedLength, // TODO
      actualEventLogLength,
    );

    return this;
  }

  const assertIsTransactionResponse = (value: any) => {
    new Assertion(value).is.transactionResponse;
  };

  method("evmFail", function(
    this: ChaiUse.Assertion,
    expectedErrorMessage?: string,
  ) {
    assertIsPromiseLike(this._obj);

    const obj: Promise<any> = this._obj;
    const derivedPromise = obj.then(
      (result: any) => {
        // Promise resolves to transaction response, if the assertion expect to fail,
        // then it should fail.
        const failMessage = isNil(expectedErrorMessage)
          ? "expected transaction to fail in EVM, but it succeeded"
          : `expected transaction to fail in EVM because of '${expectedErrorMessage}', but it succeeded`;
        failAssertion(this, failMessage, {
          actual: result,
        });

        new Assertion(result).to.be.transactionResponse;
      },
      (err: Error) => {
        if (isNil(expectedErrorMessage)) {
          // Promise rejects to error, if the assertion expect not to fail,
          // then it should fail.
          failNegatedAssertion(
            this,
            "expected transaction to succeed in EVM, but it failed",
            {
              actual: err,
            },
          );
        } else {
          const isErrorMessageMatch = err.message.indexOf(expectedErrorMessage as string) !== -1;
          this.assert(
            isErrorMessageMatch,
            `expected transaction to fail in EVM because of '${expectedErrorMessage}', but it failed of another reason`,
            `expected transaction not to fail in EVM because of '${expectedErrorMessage}', but it was`,
            expectedErrorMessage,
            err,
          );
        }
      },
    );

    this.then = derivedPromise.then.bind(derivedPromise);
    return this;
  });

  method("evmOutOfGas", function(this: ChaiUse.Assertion) {
    return this.to.evmFail("out of gas");
  });

  method("evmRevert", function(this: ChaiUse.Assertion) {
    return this.to.evmFail("revert");
  });

  method("evmSuccess", function(this: ChaiUse.Assertion) {
    assertIsPromiseLike(this._obj);

    const obj: Promise<any> = this._obj;
    const derivedPromise = obj.then(
      (result: any) => {
        // Promise resolves to transaction response, if the assertion expect not
        // to broadcast, then it should fail.
        failNegatedAssertion(
          this,
          "expected transaction to fail in EVM, but it succeeded",
        );
        new Assertion(result).to.be.transactionResponse;
      },
      (err: Error) => {
        // Promise rejects to error, if the assertion expect to broadcast,
        // then it should fail.
        failAssertion(
          this,
          "expected transaction to succeed in EVM, but it failed",
          {
            actual: err,
          },
        );
      },
    );

    this.then = derivedPromise.then.bind(derivedPromise);
    return this;
  });

  property("transactionResponse", function(
    this: ChaiUse.Assertion,
  ): ChaiUse.Assertion {
    this.assert(
      isTransactionResponse(this._obj),
      "expected #{this} to be a Truffle TransactionResponse",
      "expected #{this} not to be a Truffle TransactionResponse",
    );

    return this;
  });

  const TRANSACTION_RESPONSE_KEYS = ["tx", "receipt", "logs"];
  const isTransactionResponse = (value: any): boolean => {
    if (typeof value !== "object") {
      return false;
    }
    if (isNil(value)) {
      return false;
    }

    for (const key of TRANSACTION_RESPONSE_KEYS) {
      if (typeof value[key] === "undefined") {
        return false;
      }
    }
    return true;
  };

  method("withEventArgs", function(
    this: ChaiUse.Assertion,
    assertArgsFn: (args: Truffle.TransactionLogArgs) => boolean,
  ): ChaiUse.Assertion {
    if (!isEmitEventAsserted(this)) {
      throw new Error(
        "to assert event arguments the assertion must be asserted with emitEvent() or emitEventAt() first. i.e. expect(...).to.emitEvent(...).withEventArgs(...)",
      );
    }
    if (isNegatedBeforeAssertEmitEvent(this)) {
      throw new Error(
        "expect(...).not.to.emitEvent(...).withEventArgs(...) pattern is not support. If you are asserting a transaction has emitted an event but not with the certain argument format, consider using expect(...).to.emitEvent(...).not.withEventArgs(...) instead",
      );
    }

    const obj: Truffle.TransactionResponse = this._obj;
    const eventLogPositionList = getEmitEventLogPositionList(this);

    const firstMatchedEventLogIndex = eventLogPositionList[0];
    const eventName = obj.logs[firstMatchedEventLogIndex].event;

    const matchedEventLogs = eventLogPositionList.map(
      (position) => obj.logs[position],
    );

    const errorMessagePrefix = `expected transaction to emit event ${eventName} with matching argument(s)`;
    const negatedErrorMessage = `expected transaction to emit event ${eventName} but not with matching argument(s), but argument(s) match`;
    assertEventArgsFromMatchedEventLogsWithAssertion(
      this,
      matchedEventLogs,
      assertArgsFn,
      errorMessagePrefix,
      negatedErrorMessage,
    );

    return this;
  });

  const assertEventArgsFromMatchedEventLogsWithAssertion = (
    assertion: ChaiUse.Assertion,
    matchedEventLogs: Truffle.TransactionLog[],
    assertArgsFn: AssertArgsFn,
    errorMessagePrefix: string,
    negatedErrorMessage: string,
  ) => {
    let hasMatchedEvent = false;
    let lastError: Error | undefined;
    for (const eventLog of matchedEventLogs) {
      try {
        if (assertArgsFn(eventLog.args)) {
          hasMatchedEvent = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    let errorMessage = errorMessagePrefix;
    const assertionValue: FailAssertionValue = {};
    if (typeof lastError === "undefined") {
      errorMessage = `${errorMessage}, but argument(s) do not match`;
    } else {
      errorMessage = `${errorMessage}, but argument(s) assert function got: ${lastError.message}`;
      if (lastError instanceof chai.AssertionError) {
        const assertionError = (lastError as unknown) as ChaiAssertionError;
        assertionValue.expected = assertionError.expected;
        assertionValue.actual = assertionError.actual;
      }
    }

    assertion.assert(
      hasMatchedEvent,
      errorMessage,
      negatedErrorMessage,
      assertionValue.expected,
      assertionValue.actual,
    );
  };

  const assertIsPromiseLike = (value: any) => {
    new Assertion(value).assert(
      typeof value.then !== "undefined",
      "expected #{this} to be a Promise",
      "expected #{this} not to be a Promise",
    );
  };

  const failNegatedAssertion = (
    assertion: ChaiUse.Assertion,
    message: string,
    value: FailAssertionValue = {},
  ) => {
    assertion.assert(true, "", message, value.expected, value.actual);
  };

  const failAssertion = (
    assertion: ChaiUse.Assertion,
    message: string,
    value: FailAssertionValue = {},
  ) => {
    assertion.assert(false, message, "", value.expected, value.actual);
  };

  const isNegated = (assertion: ChaiUse.Assertion): boolean => {
    return !isNil(utils.flag(assertion, "negate"));
  };

  const isNegatedBeforeAssertEmitEvent = (
    assertion: ChaiUse.Assertion,
  ): boolean => {
    return !isNil(utils.flag(assertion, "truffleNegatedBeforeAssertEmitEvent"));
  };

  const isEmitEventAsserted = (assertion: ChaiUse.Assertion): boolean => {
    return !isNil(utils.flag(assertion, "truffleEmitEventLogPositionList"));
  };

  const setEmitEventLogPositionList = (
    assertion: ChaiUse.Assertion,
    positionList: number[],
  ) => {
    utils.flag(assertion, "truffleEmitEventLogPositionList", positionList);
  };

  const updateNegatedBeforeAssertEmitEvent = (assertion: ChaiUse.Assertion) => {
    if (isNegated(assertion)) {
      return utils.flag(assertion, "truffleNegatedBeforeAssertEmitEvent", true);
    }
  };

  const getEmitEventLogPositionList = (
    assertion: ChaiUse.Assertion,
  ): number[] => {
    return utils.flag(assertion, "truffleEmitEventLogPositionList");
  };
};

type AssertArgsFn = (args: Truffle.TransactionLogArgs) => boolean;

interface FailAssertionValue {
  expected?: any;
  actual?: any;
}

type ChaiAssertionError = typeof Chai.AssertionError & {
  expected?: any;
  actual?: any;
};
