/**
 * Composable to sync up every user's dumb own OS clocks in their view
 * @returns **.sync** which makes the server set {@link offsetBetweenClientAndServer}
 * and **.now** to replace Date.now() in the app because it corrects for {@link offsetBetweenClientAndServer}
 */
export function useServerClock() {
  // Singleton state on the client (a ref() up top would leak to other clients)
  const offsetBetweenClientAndServer = useState("server-clock-offset", () => 0); // serverNow - clientNow, in ms

  // Have the server say what time it thinks it is, and correct for the difference
  function sync(serverNow: number) {
    offsetBetweenClientAndServer.value = serverNow - Date.now();
  }
  // Local time plus the correction
  function now() {
    return Date.now() + offsetBetweenClientAndServer.value;
  }
  return { sync, now };
}
