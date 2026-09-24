import { Helmet } from "react-helmet-async";
import { domain } from "../../../shared/data/domain";
import { BASE_URL } from "../config/api";

const API_BASE =  BASE_URL;
const IMG_BASE = API_BASE.replace('/api', '');

const SEOHead = ({ vendor, products }) => {

    if (!vendor) return null;

    const description =
        vendor.storeDescription ||
        `Shop at ${vendor.storeName} on ${domain}. ${products.length} products available. Order via WhatsApp!`;

    const image =
        vendor.storeBanner
            ? `${IMG_BASE}${vendor.storeBanner}`
            : vendor.storeLogo
                ? `${IMG_BASE}${vendor.storeLogo}`
                : "";

    const storeUrl = window.location.href;

    return (

        <Helmet>

            <title>
                {vendor.storeName} — Shop on {domain}
            </title>

            <meta
                name="description"
                content={description}
            />

            {/* Open Graph */}

            <meta
                property="og:title"
                content={`${vendor.storeName} — Shop on ${domain}`}
            />

            <meta
                property="og:description"
                content={description}
            />

            <meta
                property="og:url"
                content={storeUrl}
            />

            <meta
                property="og:type"
                content="website"
            />

            {image && (

                <meta
                    property="og:image"
                    content={image}
                />

            )}

            {/* Twitter */}

            <meta
                name="twitter:card"
                content="summary_large_image"
            />

            <meta
                name="twitter:title"
                content={`${vendor.storeName} — Shop on ${domain}`}
            />

            <meta
                name="twitter:description"
                content={description}
            />

            {image && (

                <meta
                    name="twitter:image"
                    content={image}
                />

            )}

        </Helmet>

    );

};

export default SEOHead;