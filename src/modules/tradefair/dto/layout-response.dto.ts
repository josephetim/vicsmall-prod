export interface LayoutResponseDto {
  event: {
    id: string;
    slug: string;
    name: string;
    venue: string;
    eventDate: string;
  };
  field: {
    fenced: boolean;
    gatePosition: string;
    topLeftFeatures: string[];
    topFeature: string;
    premiumFrontRow: boolean;
    walkwayStyle: string;
  };
  premium: Array<Record<string, unknown>>;
  single: Array<Record<string, unknown>>;
  shared: Array<Record<string, unknown>>;
  slots: Array<Record<string, unknown>>;
}
