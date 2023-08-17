import { DebugLevel } from "../@types/enums";
import Debugger from "../src/debugger";

describe('Debugger Tests', () => { 
    it("Log Function Tests", function() {
        Debugger.level = DebugLevel.all;
        //Base
        expect(Debugger.debug("test")).toBeUndefined();
        expect(Debugger.error("test")).toBeUndefined();
        expect(Debugger.warn("test")).toBeUndefined();
        expect(Debugger.info("test")).toBeUndefined();
        expect(Debugger.log(6, "test")).toBeUndefined();
        //With Titles
        expect(Debugger.debug("title", "body")).toBeUndefined();
        expect(Debugger.error("title", "body")).toBeUndefined();
        expect(Debugger.warn("title", "body")).toBeUndefined();
        expect(Debugger.info("title", "body")).toBeUndefined();
        expect(Debugger.log(6, "title", "body")).toBeUndefined();
        //Log File
        Debugger.log_file = "./log.txt";
        expect(Debugger.debug("test")).toBeUndefined();
        expect(Debugger.error("test")).toBeUndefined();
        expect(Debugger.warn("test")).toBeUndefined();
        expect(Debugger.info("test")).toBeUndefined();
    });
});