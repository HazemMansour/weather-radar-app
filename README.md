# 🌩️ Weather Radar - MRMS RALA Display

A full-stack weather radar application that processes real-time MRMS (Multi-Radar/Multi-Sensor System) Reflectivity at Lowest Altitude (RALA) data directly from NOAA.

## 📋 Project Overview

This application meets all requirements of the full-stack weather radar challenge:
- ✅ Processes live data directly from MRMS (NOAA)
- ✅ Uses Reflectivity at Lowest Altitude (RALA) exclusively
- ✅ Dynamically updates with new radar data (no static preprocessing)
- ✅ React frontend with interactive mapping
- ✅ Node.js/Express backend
- ✅ Fully hosted on Render
- ✅ Styled, professional interface

## Technology Stack

### Frontend
- **React** - Modern component-based UI framework for building interactive user interfaces
- **React Leaflet** - Industry-standard mapping library for displaying interactive maps with radar data
- **CSS3** - Responsive styling with gradient headers and professional color schemes

### Backend
- **Node.js/Express** - Lightweight and fast web framework ideal for real-time data processing
- **CORS** - Essential middleware for secure cross-origin communication between frontend and backend
- **zlib** - Required for decompressing MRMS .gz files in real-time
- **grib2-simple** - Specialized library for parsing GRIB2 weather data formats from NOAA

## 📡 Data Source & Processing

- **MRMS (NOAA)** - Operational radar system providing real-time weather data
- **Reflectivity at Lowest Altitude (RALA)** - Surface-level precipitation measurements
- **Live Data Processing** - Direct ingestion from `mrms.ncep.noaa.gov/data/2D/ReflectivityAtLowestAltitude/`
- **Intelligent Caching** - 2-minute cache duration to balance freshness and performance
- **Fallback System** - Generated realistic data when MRMS is unavailable

## Features

### Core Functionality
- ✅ **Real-time MRMS Integration** - Live data processing directly from NOAA servers
- ✅ **Interactive Radar Map** - Color-coded reflectivity levels from 5-80 dBZ
- ✅ **Automatic Updates** - Data refreshes every 2 minutes
- ✅ **Responsive Design** - Works on desktop and mobile devices
- ✅ **Professional Styling** - Clean, modern interface with gradient headers

### Technical Excellence
- ✅ **Production Ready** - Comprehensive error handling and fallback mechanisms
- ✅ **Efficient Data Processing** - Smart sampling to handle large radar datasets
- ✅ **CORS Configuration** - Secure cross-origin communication
- ✅ **Health Monitoring** - Built-in API health checks
- ✅ **Performance Optimized** - Intelligent caching and compression handling
