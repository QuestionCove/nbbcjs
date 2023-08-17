/**
 * This is the currently unused Profile class, it may be used for 
 * profiling the various functions to verify their performance levels
 */
export default class Profiler {
    start_time: Record<string, number>;
    total_times: Record<string, number>;
    public constructor() {
        this.start_time = {};
        this.total_times = {};
    }
    public now() {
        return performance.now();
    }
    public begin(group: string) {
        this.start_time[group] = this.now();
    }
    public end(group: string) {
        const time = this.now() - this.start_time[group];
        if (!this.total_times[group]) {
            this.total_times[group] = time;
        } else {
            this.total_times[group] += time;
        }
    }
    public reset(group: string) {
        this.total_times[group] = 0;
    }
    public total(group: string) {
        return this.total_times[group];
    }
    public dumpAllGroups() {
        console.log("Profiled times:");
        for (const [name, time] of Object.entries(this.total_times)) {
            console.log(`    -${name}: ${time}ms`);
        }
    }
}