const attendanceService = require('../../src/services/attendanceService');

describe('AttendanceService', () => {
  describe('calculateDistance (Haversine formula)', () => {
    it('should calculate distance between two points correctly', () => {
      // Istanbul coordinates (approximately)
      const lat1 = 41.0082;
      const lon1 = 28.9784;
      
      // A point 1km away (approximately)
      const lat2 = 41.0172;
      const lon2 = 28.9784;
      
      const distance = attendanceService.calculateDistance(lat1, lon1, lat2, lon2);
      
      // Should be approximately 1000 meters
      expect(distance).toBeGreaterThan(900);
      expect(distance).toBeLessThan(1100);
    });

    it('should return 0 for same point', () => {
      const lat = 41.0082;
      const lon = 28.9784;
      
      const distance = attendanceService.calculateDistance(lat, lon, lat, lon);
      
      expect(distance).toBe(0);
    });

    it('should calculate known distances correctly', () => {
      // London (51.5074, -0.1278) to Paris (48.8566, 2.3522)
      // Expected distance: approximately 343 km
      const distance = attendanceService.calculateDistance(51.5074, -0.1278, 48.8566, 2.3522);
      
      // Should be approximately 343 km
      expect(distance).toBeGreaterThan(340000);
      expect(distance).toBeLessThan(350000);
    });

    it('should work with antipodal points', () => {
      // North pole to South pole
      const distance = attendanceService.calculateDistance(90, 0, -90, 0);
      
      // Should be approximately half the Earth's circumference
      // Earth's diameter is about 12,742 km, so half circumference is about 20,015 km
      expect(distance).toBeGreaterThan(19000000);
      expect(distance).toBeLessThan(21000000);
    });

    it('should handle negative coordinates', () => {
      // Buenos Aires (-34.6037, -58.3816) to Sydney (-33.8688, 151.2093)
      const distance = attendanceService.calculateDistance(-34.6037, -58.3816, -33.8688, 151.2093);
      
      // Should be a valid positive distance
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('checkGeofence', () => {
    it('should return true when student is within geofence', () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        geofence_radius: 50,
      };
      
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 5,
      };
      
      const result = attendanceService.checkGeofence(sessionLocation, studentLocation);
      
      expect(result.isWithin).toBe(true);
      expect(result.distance).toBe(0);
    });

    it('should return false when student is outside geofence', () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        geofence_radius: 15,
      };
      
      // A point approximately 100m away
      const studentLocation = {
        latitude: 41.0091,
        longitude: 28.9784,
        accuracy: 5,
      };
      
      const result = attendanceService.checkGeofence(sessionLocation, studentLocation);
      
      expect(result.isWithin).toBe(false);
      expect(result.distance).toBeGreaterThan(result.allowedDistance);
    });

    it('should include accuracy buffer in allowed distance', () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        geofence_radius: 15,
      };
      
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 10,
      };
      
      const result = attendanceService.checkGeofence(sessionLocation, studentLocation);
      
      // Allowed distance should include geofence_radius + accuracy + tolerance
      expect(result.allowedDistance).toBeGreaterThan(15);
    });

    it('should cap accuracy buffer at 20m', () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        geofence_radius: 15,
      };
      
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 100, // Very poor accuracy
      };
      
      const result = attendanceService.checkGeofence(sessionLocation, studentLocation);
      
      // Allowed distance should be 15 (radius) + 20 (max buffer) + 5 (tolerance) = 40
      expect(result.allowedDistance).toBe(40);
    });
  });

  describe('detectSpoofing', () => {
    it('should flag suspiciously high accuracy', async () => {
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 1, // Too accurate - suspicious
      };
      
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
      };
      
      const result = await attendanceService.detectSpoofing(studentLocation, sessionLocation, 'test-student-id');
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Suspiciously high GPS accuracy');
    });

    it('should flag poor GPS accuracy', async () => {
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 150, // Too poor
      };
      
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
      };
      
      const result = await attendanceService.detectSpoofing(studentLocation, sessionLocation, 'test-student-id');
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('GPS accuracy too poor');
    });

    it('should flag exact coordinate match', async () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
      };
      
      const studentLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
        accuracy: 10,
      };
      
      const result = await attendanceService.detectSpoofing(studentLocation, sessionLocation, 'test-student-id');
      
      expect(result.isSuspicious).toBe(true);
      expect(result.reasons).toContain('Coordinates exactly match classroom center');
    });

    it('should not flag normal location data', async () => {
      const sessionLocation = {
        latitude: 41.0082,
        longitude: 28.9784,
      };
      
      const studentLocation = {
        latitude: 41.0083, // Slightly different
        longitude: 28.9785,
        accuracy: 10, // Normal accuracy
      };
      
      const result = await attendanceService.detectSpoofing(studentLocation, sessionLocation, 'test-student-id');
      
      expect(result.isSuspicious).toBe(false);
      expect(result.reasons.length).toBe(0);
    });
  });

  describe('getStudentAttendanceStats', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.getStudentAttendanceStats).toBe('function');
    });
  });

  describe('processCheckIn', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.processCheckIn).toBe('function');
    });
  });

  describe('getSectionAttendanceReport', () => {
    it('should be a function', () => {
      expect(typeof attendanceService.getSectionAttendanceReport).toBe('function');
    });
  });
});
