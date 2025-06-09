async function convert() {
  const url = document.getElementById("spotifyInput").value.trim();
  if (!url) {
    alert("Please enter a Spotify playlist URL.");
    return;
  }

  try {
    const response = await fetch(`/api/convert?url=${encodeURIComponent(url)}`);
    const result = await response.json();

    if (!response.ok) {
      alert("Error: " + (result.error || "Unknown error"));
      return;
    }

    // Show the YouTube playlist link
    const linkContainer = document.getElementById("result");
    linkContainer.innerHTML = `<p>✅ <a href="${result.playlistUrl}" target="_blank" class="result-link">View YouTube Playlist</a></p>`;
  } catch (err) {
    console.error("Fetch error:", err);
    alert("Failed to convert playlist. See console for details.");
  }
}

document.getElementById('convertBtn').addEventListener('click', convert);
