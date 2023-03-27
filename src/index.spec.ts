import GpxParser, { GeoJSON } from ".";
import { promises as fsp } from "fs";

describe("GPX parser", () => {
  let parser: GpxParser;
  beforeAll(async () => {
    parser = new GpxParser(
      await fsp.readFile(__dirname + "/../test/test1.xml", "utf-8")
    );
  });

  it("should parse metadata", function () {
    const parsedMetadata = parser.metadata;

    expect(parsedMetadata.name).toEqual("GPX DEMO");
    expect(parsedMetadata.desc).toEqual("A full featured gpx demo file");
    expect(parsedMetadata.time).toEqual("2020-01-12T21:32:52");
    expect(parsedMetadata.author.name).toEqual("Demo Author");
    expect(parsedMetadata.author.email.id).toEqual("demo");
    expect(parsedMetadata.author.email.domain).toEqual("example.com");
    expect(parsedMetadata.author.link.href).toEqual("http://example.com");
    expect(parsedMetadata.author.link.type).toEqual("Web");
    expect(parsedMetadata.link.href).toEqual("http://example.com");
    expect(parsedMetadata.link.text).toEqual("Author website");
    expect(parsedMetadata.link.type).toEqual("Web");
  });

  it("should parse waypoints", function () {
    const parsedWaypoints = parser.waypoints;

    expect(parsedWaypoints.length).toEqual(2);

    const wpt0 = parsedWaypoints[0];
    expect(wpt0.name).toEqual("Porte de Carquefou");
    expect(wpt0.lat).toEqual(47.253146555709);
    expect(wpt0.lon).toEqual(-1.5153741828293);
    expect(wpt0.ele).toEqual(35);
    expect(wpt0.cmt).toEqual("Warning");
    expect(wpt0.desc).toEqual("Route");

    const wpt1 = parsedWaypoints[1];
    expect(wpt1.name).toEqual("Pont de la Tortière");
    expect(wpt1.lat).toEqual(47.235331031612);
    expect(wpt1.lon).toEqual(-1.5482325613225);
    expect(wpt1.ele).toEqual(20);
    expect(wpt1.cmt).toEqual("Bridge");
    expect(wpt1.desc).toEqual("Route");
  });

  it("should parse tracks", function () {
    const parsedTracks = parser.tracks;

    expect(parsedTracks.length).toEqual(1);

    const track = parsedTracks[0];

    expect(track.name).toEqual("Track");
    expect(track.cmt).toEqual("Bridge");
    expect(track.desc).toEqual("Demo track");
    expect(track.src).toEqual("GPX Parser");
    expect(track.number).toEqual("1");
    expect(track.type).toEqual("MTB");

    expect(track.link.href).toEqual("http://example.com");
    expect(track.link.text).toEqual("Author website");
    expect(track.link.type).toEqual("Web");

    expect(track.distance.total).toEqual(6955.702190644043);
    expect(track.distance.cumul.length).toEqual(205);

    expect(track.elevation.max).toEqual(31.6);
    expect(track.elevation.min).toEqual(4.09);
    expect(track.elevation.pos).toEqual(71.03999999999998);
    expect(track.elevation.neg).toEqual(69.44000000000001);
    expect(track.elevation.avg).toEqual(14.148731707317081);

    expect(track.points.length).toEqual(205);

    track.points.forEach(function (pt) {
      expect(pt.lat).not.toBeUndefined();
      expect(pt.lon).not.toBeUndefined();
      expect(pt.ele).not.toBeUndefined();
      expect(pt.time).toEqual(new Date("2020-02-02T07:54:30.000Z"));
    });
  });

  it("should parse routes", function () {
    const parsedRoutes = parser.routes;

    expect(parsedRoutes.length).toEqual(1);

    const route = parsedRoutes[0];

    expect(route.name).toEqual("Track");
    expect(route.cmt).toEqual("Bridge");
    expect(route.desc).toEqual("Demo track");
    expect(route.src).toEqual("GPX Parser");
    expect(route.number).toEqual("1");
    expect(route.type).toEqual("MTB");

    expect(route.link.href).toEqual("http://example.com");
    expect(route.link.text).toEqual("Author website");
    expect(route.link.type).toEqual("Web");

    expect(route.distance.total).toEqual(6955.702190644043);
    expect(route.distance.cumul.length).toEqual(205);

    expect(route.elevation.max).toEqual(31.6);
    expect(route.elevation.min).toEqual(4.09);
    expect(route.elevation.pos).toEqual(71.03999999999998);
    expect(route.elevation.neg).toEqual(69.44000000000001);
    expect(route.elevation.avg).toEqual(14.148731707317081);

    expect(route.points.length).toEqual(205);

    route.points.forEach(function (pt) {
      expect(pt.lat).not.toBeUndefined();
      expect(pt.lon).not.toBeUndefined();
      expect(pt.ele).not.toBeUndefined();
      expect(pt.time).toEqual(new Date("2020-02-02T07:54:30.000Z"));
    });
  });

  it("GetElementValue should be null", function () {
    const elemValue = parser.getElementValue(
      parser.xmlSource as unknown as HTMLElement,
      "inexistant"
    );
    expect(elemValue).toEqual(null);
  });

  it("should compute slopes", function () {
    expect(parser.tracks[0].slopes.length).toEqual(204);
  });
});

describe("GeoJSON exporter", function () {
  let parser: GpxParser;
  let geoJSON: GeoJSON;

  beforeAll(async () => {
    parser = new GpxParser(
      await fsp.readFile(__dirname + "/../test/test1.xml", "utf-8")
    );
    geoJSON = parser.toGeoJSON();
  });

  it("should export correct metadata", function () {
    expect(geoJSON.type).toEqual("FeatureCollection");
    expect(geoJSON.features.length).toEqual(4);
    expect(parser.metadata).toEqual(geoJSON.properties);
  });

  it("should export correct features", function () {
    const features = geoJSON.features;

    const f0 = features[0];
    expect(f0.geometry.type).toEqual("LineString");
    expect(f0.geometry.coordinates.length).toEqual(205);

    f0.geometry.coordinates.forEach(function (pt) {
      expect(Array.isArray(pt)).toEqual(true);
      expect((pt as number[]).length).toEqual(3);
    });

    const props0 = f0.properties;
    if (!("link" in props0)) {
      throw new Error("must have .link in properties");
    }
    expect(props0.name).toEqual("Track");
    expect(props0.cmt).toEqual("Bridge");
    expect(props0.desc).toEqual("Demo track");
    expect(props0.src).toEqual("GPX Parser");
    expect(props0.number).toEqual("1");
    expect(props0.link.href).toEqual("http://example.com");
    expect(props0.link.text).toEqual("Author website");
    expect(props0.link.type).toEqual("Web");
    expect(props0.type).toEqual("MTB");

    const f1 = features[1];
    expect(f1.geometry.type).toEqual("LineString");
    expect(f1.geometry.coordinates.length).toEqual(205);

    f1.geometry.coordinates.forEach(function (pt) {
      expect(Array.isArray(pt)).toEqual(true);
      expect((pt as number[]).length).toEqual(3);
    });

    const props1 = f1.properties;
    if (!("link" in props1)) {
      throw new Error("Missing .link on properties");
    }
    expect(props1.name).toEqual("Track");
    expect(props1.cmt).toEqual("Bridge");
    expect(props1.desc).toEqual("Demo track");
    expect(props1.src).toEqual("GPX Parser");
    expect(props1.number).toEqual("1");
    expect(props1.link.href).toEqual("http://example.com");
    expect(props1.link.text).toEqual("Author website");
    expect(props1.link.type).toEqual("Web");
    expect(props1.type).toEqual("MTB");

    const f2 = features[2];
    const feature2 = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-1.5153741828293, 47.253146555709, 35],
      },
      properties: {
        name: "Porte de Carquefou",
        cmt: "Warning",
        desc: "Route",
        sym: "Fishing Hot Spot Facility",
      },
    };
    expect(f2).toEqual(feature2);

    const f3 = features[3];
    const feature3 = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [-1.5482325613225, 47.235331031612, 20],
      },
      properties: {
        name: "Pont de la Tortière",
        cmt: "Bridge",
        desc: "Route",
        sym: null,
      },
    };
    expect(f3).toEqual(feature3);
  });
});
