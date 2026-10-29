import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://sanasa-insurance-vehicle-damage-cla.vercel.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/home/", "/Login", "/SignUp", "/Reset_password"],
        disallow: [
          "/Admin/",
          "/Office_Staff/",
          "/Agent/",
          "/Policy_Holder/",
          "/api/",
          "/driver-access/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
