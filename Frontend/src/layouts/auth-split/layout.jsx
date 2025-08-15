import { useState, useEffect } from "react";
import {
  Box,
  // Typography,
  // IconButton,
  // Divider,
  // Paper
} from "@mui/material";
// import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import dreamLitePoster from 'src/assets/logo/dream-lite-poster.png';

// If you want to use the carousel in the future, uncomment and expand this array
/*
const carouselImages = [
  {
    src: dreamLitePoster,
    alt: "Modern workspace",
    title: "Boost Your Productivity",
    description: "Streamline your workflow with our powerful SaaS platform",
  },
  // Add more slides here
];
*/

export function AuthSplitLayout({ children, sx }) {
  // Uncomment for carousel:
  /*
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
  */

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "row",
        backgroundColor: "background.default",
        ...sx,
      }}
    >
      {/* Left: Form content */}
      <Box
        sx={{
          width: { xs: "100%", md: "50%" },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 3, md: 10 },
          py: 8,
        }}
      >
        {children}
      </Box>

      {/* Right: Only Poster Image */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "50%",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          bgcolor: "grey.100",
          minHeight: "100vh",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={dreamLitePoster}
          alt="Dream Lite Poster"
          sx={{
            width: "100%",
            height: "100vh",
            objectFit: "cover",
            display: "block",
            background: "#fff",
          }}
        />
      </Box>

      {/*
      // --- Carousel Version (uncomment to enable carousel) ---

      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          width: "50%",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          bgcolor: "grey.100",
          minHeight: "100vh",
        }}
      >
        {carouselImages.map((image, index) => (
          <Box
            key={index}
            sx={{
              position: "absolute",
              inset: 0,
              opacity: index === currentSlide ? 1 : 0,
              transition: "opacity 1s",
              width: "100%",
              height: "100%",
            }}
          >
            <Box
              component="img"
              src={image.src}
              alt={image.alt}
              sx={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            <Box
              sx={{
                position: "absolute",
                inset: 0,
                bgcolor: "rgba(0,0,0,0.4)",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                p: 6,
                color: "#fff",
              }}
            >
              <Typography variant="h4" sx={{ fontWeight: "bold", mb: 2 }}>
                {image.title}
              </Typography>
              <Typography variant="h6" sx={{ color: "rgba(255,255,255,0.9)" }}>
                {image.description}
              </Typography>
            </Box>
          </Box>
        ))}

        {/* Navigation Buttons * /}
        <IconButton
          sx={{
            position: "absolute",
            left: 24,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.25)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.35)" },
            zIndex: 2,
          }}
          onClick={prevSlide}
        >
          <ArrowBackIos />
        </IconButton>
        <IconButton
          sx={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#fff",
            bgcolor: "rgba(0,0,0,0.25)",
            "&:hover": { bgcolor: "rgba(0,0,0,0.35)" },
            zIndex: 2,
          }}
          onClick={nextSlide}
        >
          <ArrowForwardIos />
        </IconButton>
        {/* Dots * /}
        <Box
          sx={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 1,
          }}
        >
          {carouselImages.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: index === currentSlide ? 32 : 12,
                height: 12,
                borderRadius: 6,
                bgcolor: index === currentSlide ? "#fff" : "rgba(255,255,255,0.6)",
                transition: "all 0.3s",
                cursor: "pointer",
              }}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </Box>
      </Box>
      */}
    </Box>
  );
}

export default AuthSplitLayout;
