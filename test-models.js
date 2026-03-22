async function getModels() {
  const apiKey = 'AIzaSyCCH4HEbO6Tr7KThKnfs1sHRhishM3cVNQ';
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!res.ok) {
        console.error("HTTP Error", res.status, await res.text());
        return;
    }
    const data = await res.json();
    console.log("SUCCESS. Available models:", data.models?.map(m => m.name).join(", "));
  } catch (e) {
    console.error("Fetch failed", e);
  }
}
getModels();
