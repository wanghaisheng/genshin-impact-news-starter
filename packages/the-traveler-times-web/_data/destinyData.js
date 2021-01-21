function mockApi() {
  return new Promise((resolve) => {
    resolve({
      season: {
        endDate: new Date("2021-02-09T00:00:00").toISOString(),
        name: "Season of the Hunt",
      },
      weekly: {
        resetDate: new Date("2021-01-19T07:00:00").toISOString(),
      },
      articles: [
        {
          title: "Xur Spotted in the Tower",
          subtitle:
            "This is a test of a subtitle. Xur is in the <strong>Hanger</strong>",
          body: "This is some body text.",
          date: new Date("2021-01-15").toISOString(),
        },
        {
          title: "Xur Spotted in the Tower",
          body: "This is some body text.",
          date: new Date("2021-01-03").toISOString(),
        },
      ],
      meta: [
        {
          gametype: "Control",
          gameZone: "PVP",
          name: "Weapons",
          items: [
            {
              name: "Abralist",
              imgSrc: "#",
              description: "Exotic Linear Fusion Rifle",
            },
            {
              name: "Abralist",
              imgSrc: "#",
              description: "Exotic Linear Fusion Rifle",
            },
            {
              name: "Abralist",
              imgSrc: "#",
              description: "Exotic Linear Fusion Rifle",
            },
          ],
        },
      ],
    });
  });
}

module.exports = async function () {
  let destinyData = await mockApi();

  return destinyData;
};
