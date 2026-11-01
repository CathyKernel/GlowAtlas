/**
 * Minimal ambient typings for the Google Maps JavaScript API surface that
 * GlowAtlas uses (loaded at runtime via the dynamic script loader).
 * Only the members we call are declared.
 */

declare namespace google {
  namespace maps {
    interface MapTypeStyle {
      featureType?: string;
      elementType?: string;
      stylers?: Record<string, string | number>[];
    }

    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLngBoundsLiteral {
      west: number;
      south: number;
      east: number;
      north: number;
    }

    interface MapOptions {
      center?: LatLngLiteral;
      zoom?: number;
      minZoom?: number;
      maxZoom?: number;
      styles?: MapTypeStyle[] | null;
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      mapTypeControl?: boolean;
      streetViewControl?: boolean;
      fullscreenControl?: boolean;
      gestureHandling?: string;
      clickableIcons?: boolean;
      backgroundColor?: string;
    }

    class LatLngBounds {
      constructor(sw: LatLngLiteral, ne: LatLngLiteral);
    }

    interface MouseEvent_ {
      latLng: LatLng | null;
    }

    class LatLng {
      constructor(lat: number, lng: number);
    }

    interface DataFeature {
      getId(): string | number;
      getProperty(key: string): any;
    }

    interface DataStyleOptions {
      fillColor?: string;
      fillOpacity?: number;
      strokeColor?: string;
      strokeOpacity?: number;
      strokeWeight?: number;
      zIndex?: number;
      cursor?: string;
      visible?: boolean;
    }

    class Data {
      addGeoJson(geojson: object, options?: { idPropertyName?: string }): DataFeature[];
      setStyle(style: DataStyleOptions | ((feature: DataFeature) => DataStyleOptions)): void;
      getFeatureById(id: string | number): DataFeature | undefined;
      addListener(event: string, handler: (e: MouseEvent_ & { feature: DataFeature }) => void): void;
      forEach(cb: (f: DataFeature) => void): void;
      overrideStyle(feature: DataFeature, style: DataStyleOptions): void;
      revertStyle(feature?: DataFeature): void;
    }

    interface Map {
      data: Data;
      setOptions(options: MapOptions): void;
      fitBounds(
        bounds: LatLngBounds | LatLngBoundsLiteral,
        padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
      ): void;
      setCenter(center: LatLngLiteral): void;
      setZoom(zoom: number): void;
      getZoom(): number;
      addListener(event: string, handler: (e: MouseEvent_) => void): void;
    }

    const Map: new (element: HTMLElement, options: MapOptions) => Map;
    const LatLngBounds: new (sw: LatLngLiteral, ne: LatLngLiteral) => LatLngBounds;
    const event: {
      addListener(target: { addListener(ev: string, h: (e?: unknown) => void): void }, event: string, handler: (e?: unknown) => void): void;
    };
  }
}

interface Window {
  google?: typeof google;
  gm_authFailure?: () => void;
  __glowatlasGmapsReady?: () => void;
}
