function sendInput(left, right) {
    fetch("http://localhost:3000/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ left, right })

    }).then(response => response.json())
        .then(data => {
            console.log("Server response:", data);
        })
        .catch(err => {
            console.error("Error:", err);
        });;
}

sendInput(true, false);