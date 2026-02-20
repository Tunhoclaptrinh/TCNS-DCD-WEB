export interface CommonCardData {
    id: number | string;
    name: string;
    image?: string;
    main_image?: string;
    type?: string;
    status?: string;
    description?: string;
    author?: string;
    publishDate?: string;
    shortDescription?: string;
    [key: string]: any;
}

export interface FeatureCardProps {
    data: CommonCardData;
    variant?: 'portrait' | 'landscape';
    cardType?: string;
}
