// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Test.sol";
import {Counter} from "../src/Counter.sol";
import {CounterScript} from "../script/Counter.s.sol";

contract CounterScriptTest is Test {
    function test_Run_DeploysCounter() public {
        CounterScript script = new CounterScript();
        script.run();

        Counter deployed = script.counter();
        // default value is 0
        assertEq(deployed.number(), 0);

        // interact with deployed instance to ensure it's usable
        deployed.setNumber(7);
        assertEq(deployed.number(), 7);
    }
}


