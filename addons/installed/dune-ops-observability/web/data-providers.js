(function () {
  const samplePlayers = [
    {
      name: "Local Test Player",
      level: 42,
      faction: "Atreides",
      guild: "Preview Guild",
      status: "Online",
      map: "Survival_1",
      lastSeen: "Now"
    },
    {
      name: "Deep Desert Scout",
      level: 58,
      faction: "Fremen",
      guild: "Sietch Patrol",
      status: "Online",
      map: "Deep Desert",
      lastSeen: "3 minutes ago"
    },
    {
      name: "Spice Harvester",
      level: 31,
      faction: "Harkonnen",
      guild: "Industrial Wing",
      status: "Offline",
      map: "Hagga Basin",
      lastSeen: "2 hours ago"
    }
  ];

  function isConsoleIframe() {
    return window.parent !== window && Boolean(window.DuneAddon);
  }

  const providers = {
    sample: {
      name: "sample",
      label: "Preview sample data",
      async listPlayers() {
        return samplePlayers;
      }
    },
    bridge: {
      name: "bridge",
      label: "Dune Docker Console bridge",
      async listPlayers() {
        const result = await window.DuneAddon.request("leadership.players.list");
        return result.players || result || [];
      }
    }
  };

  function currentProvider() {
    return isConsoleIframe() ? providers.bridge : providers.sample;
  }

  window.DuneOpsProviders = {
    currentProvider,
    providers
  };
}());
