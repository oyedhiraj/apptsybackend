const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AppTsy API Documentation',
    version: '1.0.0',
    description: 'Complete API documentation for AppTsy - Service booking platform',
    contact: {
      name: 'AppTsy Support',
      email: 'support@apptsy.com'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server'
    },
    {
      url: 'https://api.apptsy.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Authorization header using Bearer token'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'User unique identifier' },
          name: { type: 'string', description: 'Full name of the user' },
          email: { type: 'string', format: 'email', description: 'Email address' },
          password: { type: 'string', description: 'Hashed password' },
          number: { type: 'string', description: 'Phone number' },
          age: { type: 'number', description: 'Age of the user' },
          address: { type: 'string', description: 'Address of the user' },
          gender: { type: 'string', enum: ['male', 'female', 'other'], description: 'Gender' },
          role: { type: 'string', enum: ['customer', 'vendor'], description: 'User role' },
          serviceType: { type: 'string', description: 'Type of service for vendors' },
          profilePhotoPath: { type: 'string', description: 'Path to profile photo' },
          aadhaarPath: { type: 'string', description: 'Path to Aadhaar document' },
          status: { type: 'string', enum: ['available', 'busy'], description: 'Vendor status' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Booking: {
        type: 'object',
        properties: {
          _id: { type: 'string', description: 'Booking unique identifier' },
          vendorId: { type: 'string', description: 'ID of the vendor' },
          customerId: { type: 'string', description: 'ID of the customer' },
          customerName: { type: 'string', description: 'Name of the customer' },
          customerPhone: { type: 'string', description: 'Phone number of customer' },
          serviceType: { type: 'string', description: 'Type of service' },
          slotTime: { type: 'string', format: 'date-time', description: 'Service time' },
          location: { type: 'string', description: 'Service location' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      Member: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Member name' },
          age: { type: 'number', description: 'Member age' },
          number: { type: 'string', description: 'Member contact number' },
          address: { type: 'string', description: 'Member address' },
          service: { type: 'string', description: 'Service type' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT token' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              role: { type: 'string', enum: ['customer', 'vendor'] }
            }
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          error: { type: 'string' }
        }
      }
    }
  },
  paths: {
    '/api/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user (Customer or Vendor)',
        description: 'Create a new user account with profile photo and Aadhaar document',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['fullName', 'email', 'password', 'role', 'aadhaar', 'profilePhoto'],
                properties: {
                  fullName: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'SecurePass123' },
                  number: { type: 'string', example: '9876543210' },
                  age: { type: 'number', example: 28 },
                  address: { type: 'string', example: '123 Main St, City' },
                  gender: { type: 'string', enum: ['male', 'female', 'other'], example: 'male' },
                  role: { type: 'string', enum: ['customer', 'vendor'], example: 'vendor' },
                  serviceType: { type: 'string', example: 'Plumbing', description: 'Required for vendors' },
                  aadhaar: { type: 'string', format: 'binary', description: 'Aadhaar document' },
                  profilePhoto: { type: 'string', format: 'binary', description: 'Profile photo' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully',
            content: { 'application/json': { schema: { properties: { message: { type: 'string' } } } } }
          },
          '400': { description: 'Missing required fields' },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    },
    '/api/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Login user and get JWT token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'john@example.com' },
                  password: { type: 'string', format: 'password', example: 'SecurePass123' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
          },
          '401': { description: 'Invalid credentials' },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/vendors': {
      get: {
        tags: ['Authentication'],
        summary: 'Get all available vendors',
        responses: {
          '200': {
            description: 'List of all vendors',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }
          },
          '500': { description: 'Server error' }
        }
      }
    },
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Create a new booking (Customer only)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['vendorId', 'serviceType', 'slotTime', 'location'],
                properties: {
                  vendorId: { type: 'string', description: 'ID of the vendor' },
                  serviceType: { type: 'string', example: 'Plumbing' },
                  slotTime: { type: 'string', format: 'date-time', example: '2026-02-15T10:00:00Z' },
                  location: { type: 'string', example: '123 Main St, City' }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Booking created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Booking' } } }
          },
          '400': { description: 'Vendor ID required' },
          '401': { description: 'Unauthorized' },
          '404': { description: 'Customer not found' },
          '500': { description: 'Internal server error' }
        }
      }
    },
    '/api/bookings/vendor/{vendorId}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get all bookings for a specific vendor',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'vendorId',
            required: true,
            schema: { type: 'string' },
            description: 'Vendor ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of bookings for the vendor',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Booking' } } } }
          },
          '403': { description: 'Unauthorized - Can only view own bookings' },
          '500': { description: 'Internal server error' }
        }
      }
    },
    '/api/bookings/{id}/confirm': {
      put: {
        tags: ['Bookings'],
        summary: 'Confirm a booking (Vendor only)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'id',
            required: true,
            schema: { type: 'string' },
            description: 'Booking ID'
          }
        ],
        responses: {
          '200': {
            description: 'Booking confirmed successfully',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' } } } } }
          },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden - Can only confirm own bookings' },
          '404': { description: 'Booking not found' },
          '500': { description: 'Internal server error' }
        }
      }
    },
    '/api/member/add': {
      post: {
        tags: ['Members'],
        summary: 'Add a new member',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Member' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Member added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Member added successfully' },
                    data: { $ref: '#/components/schemas/Member' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'All fields are required',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: 'All fields are required' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/vendor/vendor/{vendorId}': {
      get: {
        tags: ['Vendors'],
        summary: 'Get bookings for a specific vendor',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'vendorId',
            required: true,
            schema: { type: 'string' },
            description: 'Vendor ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of vendor bookings',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Booking' } } } }
          },
          '403': { description: 'Unauthorized - Can only view own bookings' },
          '500': { description: 'Internal server error' }
        }
      }
    }
  },
  tags: [
    { name: 'Authentication', description: 'User registration and login endpoints' },
    { name: 'Bookings', description: 'Booking management endpoints' },
    { name: 'Members', description: 'Member management endpoints' },
    { name: 'Vendors', description: 'Vendor related endpoints' }
  ]
};

module.exports = swaggerSpec;
