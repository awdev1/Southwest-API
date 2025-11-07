# Southwest-API

A RESTful API wrapper for Southwest Airlines flight information and status tracking.

## Features

- Flight search functionality
- Real-time flight status tracking
- Airport status information
- Simple and easy-to-use endpoints

## Installation

```bash
npm install
```

## Configuration

Copy the `.env.example` file to `.env` and configure your settings:

```bash
cp .env.example .env
```

## Usage

Start the server:

```bash
npm start
```

The API will be available at `http://localhost:3000`

## API Endpoints

### Health Check
- `GET /` - Check API status

### Flights
- `GET /api/flights/search?from=LAX&to=SFO&date=2024-01-01` - Search for flights
- `GET /api/flights/:flightId` - Get flight details

### Status
- `GET /api/status/:flightId` - Get flight status
- `GET /api/status/airport/:code` - Get airport status

## Example Requests

### Search for flights
```bash
curl "http://localhost:3000/api/flights/search?from=LAX&to=SFO&date=2024-01-01"
```

### Get flight status
```bash
curl "http://localhost:3000/api/status/SW1234"
```

### Get airport status
```bash
curl "http://localhost:3000/api/status/airport/LAX"
```

## Response Format

All responses follow this format:

```json
{
  "success": true,
  "data": {}
}
```

Error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

## License

MIT