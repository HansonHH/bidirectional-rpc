import * as test from 'purple-tape'
import * as rpc from '../index'

class Deferred<T> {
    promise: Promise<T>
    resolve: (arg: T) => void
    reject: (reason: any) => void

    constructor() {
        this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
        })
    }
}

async function listeningServer(): Promise<rpc.RPCServer> {
    let server = new rpc.RPCServer()
    let listening = new Deferred()
    server.on('listening', listening.resolve)
    server.listen(0, '127.0.0.1')
    await listening.promise
    return server
}

async function closeServer(server: rpc.RPCServer) {
    let close = new Deferred()
    server.on('close', close.resolve)
    server.close()
    await close.promise
}

test('create server', async function(t) {
    let server = await listeningServer()
    t.pass('listening')

    await closeServer(server)
    t.pass('closed')
})

test('send messages from client to server', async function(t) {
    let clients = 0
    let serverMessages: any[] = []
    let server = await listeningServer()
    t.pass('listening')
    server.on('connection', serverClient => {
        serverClient.on('message', (message: any) =>
            serverMessages.push(message)
        )
        clients++
    })
    let address = server.address()
    let client = new rpc.RPCClient(address.port, address.address)
    let connected = new Deferred()
    client.on('connect', connected.resolve)
    await connected.promise
    t.pass('connected')
    client.sendMessage('test1')
    client.sendMessage('test2')

    client.close()

    await closeServer(server)
    t.pass('closed')
    t.equal(clients, 1, 'One client connected')
    t.equal(serverMessages.length, 2, 'Server received two messages')
    t.equal(serverMessages[0], 'test1', 'Server received test message 1')
    t.equal(serverMessages[1], 'test2', 'Server received test message 2')
})
