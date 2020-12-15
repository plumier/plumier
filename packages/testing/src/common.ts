
// --------------------------------------------------------------------- //
// ------------------------------ TESTING ------------------------------ //
// --------------------------------------------------------------------- //

const log = console.log;

declare global {
    interface Console {
        mock(): jest.Mock<void, [message: any]>
        mockClear(): void
    }
}

console.mock = () => {
    const fn = jest.fn(message => { })
    console.log = fn
    return fn
}

console.mockClear = () => console.log = log

function cleanupConsole(mocks: string[][]) {
    const cleanup = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g
    const millisecond = /\d*ms/g
    return mocks.map(x => x.map(y => y.replace(cleanup, "").replace(millisecond, "123ms")))
}

export { cleanupConsole }