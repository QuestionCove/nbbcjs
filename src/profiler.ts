import ksort from "locutus/php/array/ksort";
import microtime from "locutus/php/datetime/microtime";
import htmlspecialchars from "locutus/php/strings/htmlspecialchars";
import sprintf from "locutus/php/strings/sprintf";

export default class Profiler {
    start_time;
    total_times;
    public constructor() {
        this.start_time = [];
        this.total_times = [];
    }
    public now() {
        return microtime(true) - 1394060000;
    }
    public begin(group) {
        this.start_time[group] = this.now();
    }
    public end(group) {
        const time = this.now() - this.start_time[group];
        if (!this.total_times[group]) {
            this.total_times[group] = time;
        } else {
            this.total_times[group] += time;
        }
    }
    public reset(group) {
        this.total_times[group] = 0;
    }
    public total(group) {
        return this.total_times[group];
    }
    public dumpAllGroups() {
        console.log("<div>Profiled times:\n<ul>\n");
        ksort(this.total_times);
        for (const [name, time] of this.total_times.entries()) {
            console.log("<li><b>"+htmlspecialchars(name)+"</b>: "+sprintf("%0.2f msec", time * 1000)+"</li>\n");
        }
        console.log("</ul>\n</div>\n");
    }
}