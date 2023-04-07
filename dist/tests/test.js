import RequestBase from "../index.js";
class Test extends RequestBase {
    constructor() {
        super();
    }
    async someRequest() {
        const { body, requestOptions } = await this.doRequest("https://api64.ipify.org?format=json");
        console.log(body);
        console.log(requestOptions);
    }
}
const test = new Test();
await test.someRequest();
