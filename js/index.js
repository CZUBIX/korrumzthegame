const canvas = document.getElementById("game")

function game(username) {
    const ctx = canvas.getContext("2d")
    const topEl = document.getElementsByTagName("tr")

    const playerImages = 8

    canvas.width = innerWidth
    canvas.height = innerHeight

    class Player {
        constructor(username, x, y, pullRequests, imageNumber) {
            this.username = username
            this.x = x
            this.y = y
            this.pullRequests = pullRequests
            this.imageNumber = imageNumber

            const image = new Image()
            image.src = `images/players/${this.imageNumber}.png`

            this.playerImg = image
        }

        draw() {
            let _username = this.username

            if (this.username.length > 6)
                _username = this.username.slice(0, 6) + "..."

            ctx.beginPath()
            ctx.font = "15px Arial"
            ctx.fillStyle = "white"
            ctx.fillText(_username, this.x - (this.playerImg.width / 2) + 7, this.y - (this.playerImg.height / 2) - 10)
            ctx.drawImage(this.playerImg, this.x - (this.playerImg.width / 2), this.y - (this.playerImg.height / 2))
        }
    }

    class Bug {
        constructor(x, y, imageNumber) {
            this.x = x
            this.y = y
            this.imageNumber = imageNumber

            const image = new Image()
            image.src = `images/bugs/${this.imageNumber}.png`

            this.bugImg = image
        }

        draw() {
            ctx.beginPath()
            ctx.drawImage(this.bugImg, this.x - (this.bugImg.width / 2), this.y - (this.bugImg.height / 2))
        }
    }

    const player = new Player(username, Math.floor(Math.random() * (canvas.width - 70)) + 70, Math.floor(Math.random() * (canvas.height - 70) + 70), 0, Math.floor(Math.random() * playerImages))

    const players = [player]
    const bugs = []

    const ws = new WebSocket("ws://127.0.0.1:8080")
    let data

    function websocketHandler() {
        ws.onopen = () => {
            data = {
                event: "new player",
                data: {
                    username: player.username,
                    x: player.x,
                    y: player.y,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height,
                    imageNumber: player.imageNumber
                }
            }

            ws.send(JSON.stringify(data))
        }

        ws.onmessage = (msg) => {
            msg = JSON.parse(msg.data)
            const p = players.find(i => i.username === msg.data.username)

            switch (msg.event) {
                case "new player":
                    players.push(new Player(msg.data.username, msg.data.x, msg.data.y, msg.data.pullRequests, msg.data.imageNumber))
                    break

                case "new username":
                    player.username = msg.data.username
                    break

                case "move":
                    p.x = msg.data.x
                    p.y = msg.data.y
                    break

                case "new bug":
                    bugs.push(new Bug(msg.data.x, msg.data.y, msg.data.imageNumber))
                    break
                
                case "pull request":
                    bugs.splice(bugs.indexOf(bugs.find(bug => (bug.x === msg.data.bug.x) && (bug.y === msg.data.bug.y) && (bug.imageNumber === msg.data.bug.imageNumber))), 1)
                    p.pullRequests = msg.data.pullRequests
                    break

                case "new gban":
                    if (msg.data.username === player.username) {
                        localStorage.setItem("gban", true)
                        ws.close()
                        location.reload()
                    }
                    break

                case "player disconnected":
                    players.splice(players.indexOf(p), 1)
                    break
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate)

        ctx.fillStyle = "#202020"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        players.forEach(player => player.draw())
        bugs.forEach(bug => bug.draw())

        const top = players.sort((a, b) => b.pullRequests - a.pullRequests)
        let currentRow

        for (i = 1; i < 5; i++) {
            currentRow = topEl[i].getElementsByTagName("td")
            currentRow[0].innerHTML = !!top[i - 1] ? ((top[i - 1].username.length > 6) ? top[i - 1].username.slice(0, 6) + "..." : top[i - 1].username) : ""
            currentRow[1].innerHTML = !!top[i - 1] ? top[i - 1].pullRequests : ""
        }
    }

    addEventListener("resize", () => {
        canvas.width = innerWidth
        canvas.height = innerHeight
    })

    addEventListener("keypress", (key) => {
        const speed = 30

        const events = {
            "KeyW": () => {
                if (player.y - player.playerImg.height >= 0)
                    player.y -= speed
            },
            "KeyA": () => {
                if (player.x - player.playerImg.width >= 0)
                    player.x -= speed
            },
            "KeyS": () => {
                if (player.y + player.playerImg.height <= canvas.height)
                    player.y += speed
            },
            "KeyD": () => {
                if (player.x + player.playerImg.width <= canvas.width)
                    player.x += speed
            }
        }

        if (events.hasOwnProperty(key.code)) {
            events[key.code]()
            
            data = {
                event: "move",
                data: {
                    username: player.username,
                    x: player.x,
                    y: player.y
                }
            }

            ws.send(JSON.stringify(data))
        }
    })

    websocketHandler()
    animate()
}

function init() {
    const intro = localStorage.getItem("intro")
    const gban = localStorage.getItem("gban")

    const sexmort = document.getElementById("sexmort")
    const video = document.getElementById("intro")
    video.style.display = "none"

    if (gban) {
        document.getElementsByTagName("h1")[0].innerHTML = "korrumz ci dał gbana"
    } else {
        const username = document.getElementById("username").value
        localStorage.setItem("username", username)
        document.getElementsByClassName("ui")[0].style.display = "none"
        sexmort.style.display = "none"
        document.getElementById("menu").style.background = "transparent"

        if (intro) {
            document.getElementsByTagName("table")[0].style.display = "block"
            canvas.style.display = "block"
            game(username)
        } else {
            localStorage.setItem("intro", true)
            video.style.display = "block"
            video.volume = 0.1
            video.play()
        }
    }
}

if (localStorage.getItem("username")) document.getElementById("username").value = localStorage.getItem("username")
