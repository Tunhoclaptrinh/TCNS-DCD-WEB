import React from "react";
import { Tag, Tooltip } from "antd";
import {
  StarFilled,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import "./styles.less";
import { FeatureCardProps } from "./types";
import { ITEM_TYPE_LABELS } from "@/config/constants";
import { getImageUrl, resolveImage } from "@/utils/image.helper";

const FeatureCard: React.FC<FeatureCardProps> = ({
  data,
  cardType = 'item',
  variant = 'landscape',
}) => {
  const linkPath = `/${cardType ? cardType + 's' : 'items'}/${data.id}`;

  const rawImage = resolveImage(data.image) || resolveImage(data.main_image) || resolveImage(data.images);
  const imageUrl = getImageUrl(rawImage, "https://via.placeholder.com/300x400?text=No+Image");
  const subtitle = data.type || data.category;

  return (
    <Link to={linkPath} style={{ display: 'block', height: '100%' }}>
      <div className={`feature-card ${variant} ${cardType}`}>
        {/* Cover Image Area */}
        <div className="card-cover">
          <div
            className="card-image-bg"
            style={{
              backgroundImage: `url(${imageUrl})`
            }}
          />

          {/* Top Overlay: Badge */}
          {data.is_featured && (
            <div className="overlay-badges">
              <Tag color="gold" className="featured-tag">
                Nổi bật
              </Tag>
            </div>
          )}

          {/* Bottom Overlay: Type & Rating */}
          <div className="card-info-overlay">
            <Tag className="type-tag">
              {ITEM_TYPE_LABELS[data.type as keyof typeof ITEM_TYPE_LABELS] || data.type || 'Mục'}
            </Tag>

            {data.rating && (
              <div className="card-rating">
                <StarFilled style={{ color: "#faad14" }} />
                <span className="rating-value">
                  {data.rating.toFixed(1)}
                </span>
                <span className="rating-count">
                  ({data.total_reviews || 0})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="card-content">
          {/* Title */}
          <Tooltip title={data.name} placement="top">
            <h3 className="card-title">{data.name}</h3>
          </Tooltip>

          {/* Subtitle: Region or Dynasty */}
          {subtitle && (
            <div className="card-location">
              <span>{subtitle}</span>
            </div>
          )}

          {/* Description (Hidden relative to CSS but kept in DOM if needed later) */}
          <p className="card-description">{data.description}</p>
        </div>
      </div>
    </Link>
  );
};

export default FeatureCard;
