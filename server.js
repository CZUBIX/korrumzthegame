const express = require("express")
const WebSocket = require("ws")
const path = require("path")

const app = express()
const wss = new WebSocket.Server({
    host: "0.0.0.0",
    port: 6202
})

app.listen(6201, "0.0.0.0")

const clients = {}
let data

const bugImages = 7
const bugs = []
let totalBugs = 0

const getDistance = (x1, y1, x2, y2) => { return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) }

app.use("/css", express.static(path.join(__dirname, "css")))
app.use("/images", express.static(path.join(__dirname, "images")))
app.use("/js", express.static(path.join(__dirname, "js")))
app.use("/videos", express.static(path.join(__dirname, "videos")))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
})

setInterval(() => {
    data = {
        event: "anty kick"
    }

    for (client in clients)
        clients[client].ws.send(JSON.stringify(data))
}, 10000)

setInterval(() => {
    for (i = 0; i < totalBugs; i++) {
        if (bugs.length <= 40) {
            const bug = {
                x: Math.floor(Math.random() * (1920 - 85)) + 85,
                y: Math.floor(Math.random() * (1080 - 50)) + 50,
                imageNumber: Math.floor(Math.random() * (bugImages - 1)) + 1
            }

            data = {
                event: "new bug",
                data: bug
            }

            bugs.push(bug)

            for (client in clients) {
                clients[client].ws.send(JSON.stringify(data))
            }
        }
    }
}, 3000)

wss.on("connection", (ws) => {
    totalBugs += 2

    ws.onmessage = (msg) => {
        try {
            msg = JSON.parse(msg.data)

            let username = msg.data.username

            switch (msg.event) {
                case "new player":
                    if (clients.hasOwnProperty(username)) {
                        username = username + Math.floor(Math.random() * 100)

                        data = {
                            event: "new username",
                            data: {
                                username: username
                            }
                        }

                        ws.send(JSON.stringify(data))
                    }

                    clients[username] = {}
                    clients[username].ws = ws
                    clients[username].username = username
                    clients[username].x = msg.data.x
                    clients[username].y = msg.data.y
                    clients[username].canvasWidth = msg.data.canvasWidth
                    clients[username].canvasHeight = msg.data.canvasHeight
                    clients[username].pullRequests = 0
                    clients[username].imageNumber = msg.data.imageNumber

                    for (client in clients) {
                        client = clients[client]

                        if (!(client.username === username)) {
                            data = {
                                event: "new player",
                                data: {
                                    username: username,
                                    x: clients[username].x,
                                    y: clients[username].y,
                                    pullRequests: clients[username].pullRequests,
                                    imageNumber: clients[username].imageNumber
                                }
                            }

                            client.ws.send(JSON.stringify(data))

                            data = {
                                event: "new player",
                                data: {
                                    username: client.username,
                                    x: client.x,
                                    y: client.y,
                                    pullRequests: client.pullRequests,
                                    imageNumber: client.imageNumber
                                }
                            }

                            ws.send(JSON.stringify(data))
                        }
                    }

                    bugs.forEach(bug => {
                        data = {
                            event: "new bug",
                            data: bug
                        }

                        ws.send(JSON.stringify(data))
                    })

                    break

                case "move":
                    if (ws === clients[username].ws) {
                        if ((msg.data.y < 0) || (msg.data.x < 0) || (msg.data.y > clients[username].canvasHeight) || (msg.data.x > clients[username].canvasWidth)) {
                            data = {
                                event: "new gban",
                                data: {
                                    username: username
                                }
                            }

                            for (client in clients)
                                clients[client].ws.send(JSON.stringify(data))
                        } else {
                            clients[username].x = msg.data.x
                            clients[username].y = msg.data.y

                            data = {
                                event: "move",
                                data: {
                                    username: username,
                                    x: clients[username].x,
                                    y: clients[username].y,
                                    pullRequests: clients[username].pullRequests
                                }
                            }

                            for (client in clients) {
                                client = clients[client]

                                if (!(client.username === username)) {
                                    client.ws.send(JSON.stringify(data))
                                }
                            }

                            bugs.forEach((bug, index) => {
                                if (getDistance(clients[username].x, clients[username].y, bug.x, bug.y) < (30 / 2) + (75 / 2)) {
                                    clients[username].pullRequests ++

                                    data = {
                                        event: "pull request",
                                        data: {
                                            username: username,
                                            pullRequests: clients[username].pullRequests,
                                            bug: bug
                                        }
                                    }

                                    for (client in clients)
                                        clients[client].ws.send(JSON.stringify(data))

                                    bugs.splice(index, 1)
                                }
                            })
                        }
                    }

                    break
            }
        } catch(e) {}
    }

    ws.onclose = () => {
        try {
            let username

            for (client in clients) {
                client = clients[client]

                if (client.ws === ws) {
                    username = client.username
                }
            }

            for (client in clients) {
                client = clients[client]

                if (!(client.username === username)) {
                    data = {
                        event: "player disconnected",
                        data: {
                            username: username
                        }
                    }

                    client.ws.send(JSON.stringify(data))
                }
            }

            totalBugs -= 2
            delete clients[username]
        } catch(e) {}
    }
})