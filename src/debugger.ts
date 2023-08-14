import fs from 'fs';
import { DebugLevel } from "../@types/enums";

export default class Debugger {
    public static level: DebugLevel = DebugLevel.warn;
    public static log_file: undefined | string;
    // File to log messages to
    public static log(level: DebugLevel, title: string, string?: any) {
        if (level >= this.level) {
            if (this.log_file) {
                title = '['+new Date().toLocaleString()+'] '+title;
                fs.appendFileSync(this.log_file, title+" "+JSON.stringify(string,null,4)+"\n");
            } else {
                switch(level) {
                case DebugLevel.debug: 
                    if (string)
                        console.debug(`\x1b[1m\x1b[90m${title}\x1b[0m`, string);
                    else 
                        console.debug(title); 
                    break;
                case DebugLevel.error: 
                    if (string)
                        console.error(`\x1b[1m\x1b[31m${title}\x1b[0m`, string);
                    else 
                        console.error(title); 
                    break;
                case DebugLevel.warn: 
                    if (string)
                        console.warn(`\x1b[1m\x1b[33m${title}\x1b[0m`, string);
                    else 
                        console.warn(title); 
                    break;
                case DebugLevel.info: 
                    if (string)
                        console.info(`\x1b[1m\x1b[34m${title}\x1b[0m`, string);
                    else 
                        console.info(title); 
                    break;
                default:
                    if (string)
                        console.log(`\x1b[1m${title}\x1b[0m`, string);
                    else 
                        console.log(title); 
                    break;
                }
                
            }
        }
    }
    public static debug(title: string, string?: any) {
        this.log(DebugLevel.debug, title, string);
    }
    public static info(title: string, string?: any) {
        this.log(DebugLevel.info, title, string);
    }
    public static warn(title: string, string?: any) {
        this.log(DebugLevel.warn, title, string);
    }
    public static error(title: string, string?: any) {
        this.log(DebugLevel.error, title, string);
    }
}