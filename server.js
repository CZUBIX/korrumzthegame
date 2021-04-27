const express = require("express")
const WebSocket = require("ws")
const path = require("path")
const { json } = require("express")
const { isNumber } = require("util")

const app = express()
const wss = new WebSocket.Server({
    host: "0.0.0.0",
    port: 6202
})

app.listen(6201, "0.0.0.0")

const clients = {}
let data

const playerImages = 20
const bugImages = 7
const bugs = []
let totalBugs = 0

const getDistance = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))

app.use("/css", express.static(path.join(__dirname, "css")))
app.use("/images", express.static(path.join(__dirname, "images")))
app.use("/js", express.static(path.join(__dirname, "js")))
app.use("/videos", express.static(path.join(__dirname, "videos")))
app.use("/audio", express.static(path.join(__dirname, "audio")))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
})

setInterval(() => {
    for (client in clients) {
        client = clients[client]

        data = {
            event: "anty kick",
            data: {
                username: client.username
            }
        }

        client.ws.send(JSON.stringify(data))
    }
}, 10000)

setInterval(() => {
    for (i = 0; i < totalBugs; i++) {
        if (bugs.length <= 40) {
            const bug = {
                x: Math.floor(Math.random() * (1920 - 60)) + 60,
                y: Math.floor(Math.random() * (1007 - 60)) + 60,
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
            let imageNumber = msg.data.imageNumber

            switch (msg.event) {
                case "new player":
                    if (clients.hasOwnProperty(username) || !username) {
                        username = (username || "player") + Math.floor(Math.random() * 100)

                        data = {
                            event: "new username",
                            data: {
                                username: username
                            }
                        }

                        ws.send(JSON.stringify(data))
                    }

                    if (!(Number.isInteger(msg.data.imageNumber)) || (msg.data.imageNumber > playerImages) || (msg.data.imageNumber < 1)) {
                        imageNumber = Math.floor(Math.random() * (playerImages - 1)) + 1

                        data = {
                            event: "new image",
                            data: {
                                imageNumber: imageNumber
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
                    clients[username].imageNumber = imageNumber

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

                case "new size":
                    if (ws === clients[username].ws) {
                        clients[username].canvasWidth = msg.data.canvasWidth
                        clients[username].canvasHeight = msg.data.canvasHeight
                    }

                    break
            }
        } catch(e) {}
    }

    ws.onclose = () => {
        try {
            const usernames = []

            for (client in clients) {
                client = clients[client]

                if (client.ws === ws) {
                    usernames.push(client.username)
                }
            }

            for (client in clients) {
                client = clients[client]

                if (!usernames.includes(client.username)) {
                    usernames.forEach(username => {
                        data = {
                            event: "player disconnected",
                            data: {
                                username: username
                            }
                        }

                        client.ws.send(JSON.stringify(data))
                        delete clients[username]
                        totalBugs -= 2
                    })
                }
            }
        } catch(e) {}
    }
})
