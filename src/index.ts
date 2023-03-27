import { JSDOM } from "jsdom";

type Point = {
  lat: number;
  lon: number;
  ele: number | null;
  name?: string | null;
  sym?: string | null;
  cmt?: string | null;
  desc?: string | null;
  time?: Date | null;
};

type RouteDistance = { total: number; cumul: number[] };

type ElevationStats = {
  max: number | null;
  min: number | null;
  pos: number | null;
  neg: number | null;
  avg: number | null;
};
type Link = {
  href: string;
  text: string | null;
  type: string | null;
};

type AuthorEmail = {
  id: string;
  domain: string;
};

type Author = {
  name: string | null;
  email: AuthorEmail;
  link: Link;
};

type Metadata = {
  name: string | null;
  desc: string | null;
  time: string | null;
  author: Author;
  link: Link;
};

type Route = {
  name: string | null;
  cmt: string | null;
  desc: string | null;
  src: string | null;
  number: string | null;
  type: string | null;
  link: Link;
  distance: RouteDistance;
  elevation: ElevationStats;
  slopes: number[];
  points: Point[];
};

type Track = {
  name: string | null;
  cmt: string | null;
  desc: string | null;
  src: string | null;
  number: string | null;
  type: string | null;
  link: Link;
  distance: RouteDistance;
  elevation: ElevationStats;
  slopes: number[];
  points: Point[];
};

type LineStringFeature = {
  type: "Feature";
  geometry: {
    type: "LineString";
    coordinates: [number, number, number][];
  };
  properties: {
    name: string | null;
    cmt: string | null;
    desc: string | null;
    src: string | null;
    number: string | null;
    link: Link;
    type: string | null;
  };
};

type PointFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  };
  properties: {
    name?: string | null;
    sym?: string | null;
    cmt?: string | null;
    desc?: string | null;
  };
};

export type GeoJSON = {
  type: string;
  features: (LineStringFeature | PointFeature)[];
  properties: {
    name: string | null;
    desc: string | null;
    time: string | null;
    author: Author;
    link: Link;
  };
};

const parseXml = (xml: string): Document => {
  if (typeof window !== "undefined" && window.DOMParser) {
    return new window.DOMParser().parseFromString(xml, "text/xml");
  } else {
    return new JSDOM(xml, { contentType: "text/xml" }).window.document;
  }
};

export default class GPXParser {
  public xmlSource: Document;
  public metadata: Metadata;
  public waypoints: Point[] = [];
  public routes: Route[] = [];
  public tracks: Track[] = [];

  /**
   * Parse a gpx formatted string to a GPXParser Object
   *
   * @param gpxstring - A GPX formatted String
   *
   * @return A GPXParser object
   */
  constructor(gpxstring: string) {
    this.xmlSource = parseXml(gpxstring);

    this.metadata = this.parseMetadata(
      this.xmlSource.querySelector("metadata") as unknown as HTMLElement
    );

    const wpts = this.xmlSource.querySelectorAll<HTMLElement>("wpt");
    for (const wpt of wpts) {
      const ele = parseFloat(this.getElementValue(wpt, "ele") || "0");
      const time = this.getElementValue(wpt, "time");

      const pt: Point = {
        name: this.getElementValue(wpt, "name"),
        sym: this.getElementValue(wpt, "sym"),
        lat: parseFloat(wpt.getAttribute("lat") || ""),
        lon: parseFloat(wpt.getAttribute("lon") || ""),
        ele: isNaN(ele) ? null : ele,
        cmt: this.getElementValue(wpt, "cmt"),
        desc: this.getElementValue(wpt, "desc"),
        time: !time ? null : new Date(time),
      };

      this.waypoints.push(pt);
    }

    const rtes = this.xmlSource.querySelectorAll<HTMLElement>("rte");
    for (const rte of rtes) {
      const type = this.queryDirectSelector(rte, "type");

      const linkElem = rte.querySelector("link");
      const link = linkElem
        ? {
            href: linkElem.getAttribute("href") || "",
            text: this.getElementValue(linkElem, "text"),
            type: this.getElementValue(linkElem, "type"),
          }
        : {
            href: "",
            text: "",
            type: "",
          };

      const points: Point[] = [];
      const rtepts = rte.querySelectorAll<HTMLElement>("rtept");

      for (const rtept of rtepts) {
        const floatValue = parseFloat(
          this.getElementValue(rtept, "ele") || "0"
        );
        const time = this.getElementValue(rtept, "time");

        const pt: Point = {
          lat: parseFloat(rtept.getAttribute("lat") || "0"),
          lon: parseFloat(rtept.getAttribute("lon") || "0"),
          ele: isNaN(floatValue) ? null : floatValue,
          time: !time ? null : new Date(time),
        };

        points.push(pt);
      }

      const distance = this.calcRouteDistance(points);

      const route: Route = {
        name: this.getElementValue(rte, "name"),
        cmt: this.getElementValue(rte, "cmt"),
        desc: this.getElementValue(rte, "desc"),
        src: this.getElementValue(rte, "src"),
        number: this.getElementValue(rte, "number"),
        type: type ? type.innerHTML : null,
        link,
        points,
        distance,
        elevation: this.calcElevationStats(points),
        slopes: this.calcSlope(points, distance.cumul),
      };

      this.routes.push(route);
    }

    const trks = this.xmlSource.querySelectorAll<HTMLElement>("trk");

    for (const trk of trks) {
      const type = this.queryDirectSelector(trk, "type");
      const linkElem = trk.querySelector("link");

      const points: Point[] = [];
      const trkpts = trk.querySelectorAll<HTMLElement>("trkpt");
      for (const trkpt of trkpts) {
        const floatValue = parseFloat(
          this.getElementValue(trkpt, "ele") || "0"
        );
        const time = this.getElementValue(trkpt, "time");
        const pt: Point = {
          lat: parseFloat(trkpt.getAttribute("lat") || "0"),
          lon: parseFloat(trkpt.getAttribute("lon") || "0"),
          ele: isNaN(floatValue) ? null : floatValue,
          time: !time ? null : new Date(time),
        };

        points.push(pt);
      }

      const distance = this.calcRouteDistance(points);

      const track: Track = {
        name: this.getElementValue(trk, "name"),
        cmt: this.getElementValue(trk, "cmt"),
        desc: this.getElementValue(trk, "desc"),
        src: this.getElementValue(trk, "src"),
        number: this.getElementValue(trk, "number"),
        type: type ? type.innerHTML : null,
        link: linkElem
          ? {
              href: linkElem.getAttribute("href") || "",
              text: this.getElementValue(linkElem, "text"),
              type: this.getElementValue(linkElem, "type"),
            }
          : {
              href: "",
              text: "",
              type: "",
            },
        distance,
        elevation: this.calcElevationStats(points),
        slopes: this.calcSlope(points, distance.cumul),
        points,
      };
      this.tracks.push(track);
    }
  }

  public parseMetadata(metadata: HTMLElement | null): Metadata {
    if (!metadata) {
      return {
        name: "",
        desc: "",
        time: "",
        author: {
          name: "",
          email: {
            id: "",
            domain: "",
          },
          link: {
            href: "",
            text: "",
            type: "",
          },
        },
        link: {
          href: "",
          text: "",
          type: "",
        },
      };
    }

    const linkElem = this.queryDirectSelector(metadata, "link");
    const link = linkElem
      ? {
          href: linkElem.getAttribute("href") || "",
          text: this.getElementValue(linkElem as HTMLElement, "text"),
          type: this.getElementValue(linkElem as HTMLElement, "type"),
        }
      : {
          href: "",
          text: "",
          type: "",
        };

    return {
      name: this.getElementValue(metadata, "name"),
      desc: this.getElementValue(metadata, "desc"),
      time: this.getElementValue(metadata, "time"),
      author: this.parseAuthor(metadata.querySelector("author")),
      link,
    };
  }

  public parseAuthor(authorElem: Element | null): Author {
    if (!authorElem) {
      return {
        name: "",
        email: {
          id: "",
          domain: "",
        },
        link: {
          href: "",
          text: "",
          type: "",
        },
      };
    }

    const authorLinkElem = authorElem.querySelector("link");
    const authorEmailElem = authorElem.querySelector("email");
    return {
      name: this.getElementValue(authorElem as HTMLElement, "name"),
      email: authorEmailElem
        ? {
            id: authorEmailElem.getAttribute("id") || "",
            domain: authorEmailElem.getAttribute("domain") || "",
          }
        : {
            id: "",
            domain: "",
          },
      link: authorLinkElem
        ? {
            href: authorLinkElem.getAttribute("href") || "",
            text: this.getElementValue(authorLinkElem, "text"),
            type: this.getElementValue(authorLinkElem, "type"),
          }
        : {
            href: "",
            text: "",
            type: "",
          },
    };
  }

  /**
   * Get value from a XML DOM element
   *
   * @param parent - Parent DOM Element
   * @param needle - Name of the searched element
   *
   * @return {} The element value
   */
  public getElementValue(parent: HTMLElement, needle: string): string | null {
    const elem = parent.querySelector<Element>(needle);
    if (elem !== null) {
      return elem.innerHTML !== undefined
        ? elem.innerHTML
        : // Not sure if the following is a valid case, but it
          // was in the original version of this extension.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (elem as any)?.data;
    }
    return null;
  }

  /**
   * Search the value of a direct child XML DOM element
   *
   * @param parent DOM Element
   * @param name of the searched element
   *
   * @return {} The element value
   */
  public queryDirectSelector(parent: HTMLElement, needle: string): HTMLElement {
    const elements = parent.querySelectorAll<HTMLElement>(needle);
    let finalElem: HTMLElement = elements[0];

    if (elements.length > 1) {
      const directChilds = parent.children;

      for (const elem of directChilds) {
        if ("tagName" in elem && elem.tagName === needle) {
          finalElem = elem as HTMLElement;
        }
      }
    }

    return finalElem;
  }

  /**
   * Calcul the Distance Object from an array of points
   *
   * @param points - An array of points with lat and lon properties
   *
   * @return An object with total distance and Cumulative distances
   */
  public calcRouteDistance(points: Point[]): RouteDistance {
    let totalDistance = 0;
    const cumulDistance: number[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      totalDistance += this.calcDistanceBetween(points[i], points[i + 1]);
      cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    return { total: totalDistance, cumul: cumulDistance };
  }

  /**
   * Calcul Distance between two points with lat and lon
   *
   * @param wpt1 - A geographic point with lat and lon properties
   * @param wpt2 - A geographic point with lat and lon properties
   *
   * @returns The distance between the two points
   */
  public calcDistanceBetween(wpt1: Point, wpt2: Point): number {
    const rad = Math.PI / 180;
    const lat1 = wpt1.lat * rad;
    const lat2 = wpt2.lat * rad;
    const sinDLat = Math.sin(((wpt2.lat - wpt1.lat) * rad) / 2);
    const sinDLon = Math.sin(((wpt2.lon - wpt1.lon) * rad) / 2);
    const a =
      sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  }

  /**
   * Generate Elevation Object from an array of points
   *
   * @param points - An array of points with ele property
   *
   * @returns An object with negative and positive height difference and
   *          average, max and min altitude data
   */
  public calcElevationStats(points: Point[]): ElevationStats {
    let dp = 0;
    let dm = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const rawNextElevation = points[i + 1].ele || 0;
      const rawElevation = points[i].ele || 0;

      if (rawNextElevation !== null && rawElevation !== null) {
        const diff = rawNextElevation - rawElevation;

        if (diff < 0) {
          dm += diff;
        } else if (diff > 0) {
          dp += diff;
        }
      }
    }

    const elevation: number[] = [];
    let sum = 0;

    for (let i = 0, len = points.length; i < len; i++) {
      const rawElevation = points[i].ele;

      if (rawElevation !== null) {
        const ele = points[i].ele || 0;
        elevation.push(ele);
        sum += ele;
      }
    }

    return {
      max: Math.max.apply(null, elevation) || null,
      min: Math.min.apply(null, elevation) || null,
      pos: Math.abs(dp) || null,
      neg: Math.abs(dm) || null,
      avg: sum / elevation.length || null,
    };
  }

  /**
   * Generate slopes Object from an array of Points and an array of Cumulative distance
   *
   * @param points - An array of points with ele property
   * @param cumul - An array of cumulative distance
   *
   * @returns An array of slopes
   */
  public calcSlope(points: Point[], cumul: number[]): number[] {
    const slopes: number[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const point = points[i];
      const nextPoint = points[i + 1];
      const elevationDiff = (nextPoint.ele || 0) - (point.ele || 0);
      const distance = cumul[i + 1] - cumul[i];

      const slope = (elevationDiff * 100) / distance;
      slopes.push(slope);
    }

    return slopes;
  }

  /**
   * Export the GPX object to a GeoJSON formatted Object
   *
   * @returns a GeoJSON formatted Object
   */
  public toGeoJSON(): GeoJSON {
    const geoJSON: GeoJSON = {
      type: "FeatureCollection",
      features: [],
      properties: {
        name: this.metadata.name,
        desc: this.metadata.desc,
        time: this.metadata.time,
        author: this.metadata.author,
        link: this.metadata.link,
      },
    };

    for (const track of this.tracks) {
      const feature: LineStringFeature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
        properties: {
          name: track.name,
          cmt: track.cmt,
          desc: track.desc,
          src: track.src,
          number: track.number,
          link: track.link,
          type: track.type,
        },
      };

      for (const pt of track.points) {
        feature.geometry.coordinates.push([pt.lon, pt.lat, pt.ele || 0]);
      }

      geoJSON.features.push(feature);
    }

    for (const track of this.routes) {
      const feature: LineStringFeature = {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [],
        },
        properties: {
          name: track.name,
          cmt: track.cmt,
          desc: track.desc,
          src: track.src,
          number: track.number,
          link: track.link,
          type: track.type,
        },
      };

      for (const pt of track.points) {
        feature.geometry.coordinates.push([pt.lon, pt.lat, pt.ele || 0]);
      }

      geoJSON.features.push(feature);
    }

    for (const pt of this.waypoints) {
      const feature: PointFeature = {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [pt.lon, pt.lat, pt.ele || 0],
        },
        properties: {
          name: pt.name,
          sym: pt.sym,
          cmt: pt.cmt,
          desc: pt.desc,
        },
      };

      geoJSON.features.push(feature);
    }

    return geoJSON;
  }
}
