var b = new Bugout("v86-vlan");
// From https://bitcoin.stackexchange.com/a/52728
function toHexString(byteArray) {
    return Array.prototype.map.call(byteArray, function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');
}
function toByteArray(hexString) {
    var result = [];
    for (var i = 0; i < hexString.length; i += 2) {
        result.push(parseInt(hexString.substr(i, 2), 16));
    }
    return result;
}
// Keep packets if the WebSocket's down
var sendQ = [];
/**
 * @type {WebSocket} socket
 */
var socket;
function connectSocket() {
    socket = new WebSocket("wss://relay.widgetry.org");
    socket.binaryType = "arraybuffer";
    socket.addEventListener("open", function (open) {
        console.log("Socket open");
        while (sendQ.length > 0) {
            if (socket.readyState == 1) {
                socket.send(sendQ.pop());
            }
        }
    });
    function closeFunc() {
        console.log("Lost socket");
        // Just in case
        socket.close();
        socket.removeEventListener("close", closeFunc);
        socket.removeEventListener("error", closeFunc);
        setTimeout(connectSocket, 1000);
    }
    function messageFunc(event) {
        // console.log(`Message from bridge: ${toHexString(new Uint8Array(event.data))}`);
        b.send(toHexString(new Uint8Array(event.data)));
    };
    socket.addEventListener("message", messageFunc);
    socket.addEventListener("close", closeFunc);
    socket.addEventListener("error", closeFunc);
};
b.on("message", function (address, message) {
    if(b.address==address) {
        console.log("Loopback!");
        return;
    }
    if (socket.readyState == 1) {
        socket.send(new Uint8Array(toByteArray(message)));
    }
    else {
        sendQ.push(new Uint8Array(toByteArray(message)));
    }
    // Bad for performance
    // console.log(`Packet from ${address}: ${message}`);
});
b.on("seen", function (peer) {
    console.log(`Seen ${peer}`);
});
connectSocket();