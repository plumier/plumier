
const log = console.log;

export namespace consoleLog {
    export function startMock(){
        console.log = jest.fn(message => {})
    }
    export function clearMock(){
        console.log = log
    }
}