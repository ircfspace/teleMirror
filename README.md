# teleMirror

teleMirror provides a reliable way to access Telegram channels in heavily filtered internet environments. By utilizing multiple bypass techniques and alternative data sources, it ensures consistent access to content even when direct Telegram connections are blocked.

## Features

- 👀 **No Telegram Required**: View channels without installing the official Telegram app
- 🔄 **Multi-Source Access**: Direct Telegram access + GitHub JSON backup for maximum reliability
- 🛡️ **Advanced Bypass**: Multiple proxy methods including Google Translate to circumvent filtering
- 🎨 **Clean Interface**: Modern UI optimized for content reading
- 💾 **Smart Caching**: Reduces requests and improves loading speed
- 📊 **Rich Content**: Display posts with views, and media previews
- 🌐 **Multi-Language Support**: Switch between Persian (Farsi) and English with a single click

![Cover](.github/images/screenshot.png)

## Downloads

Pre-built binaries are available for the following platforms and architectures:

| Platform | Architectures    |
| -------- | ---------------- |
| Windows  | x64, ia32, arm64 |
| Linux    | x64, arm64       |
| macOS    | x64, arm64       |

You can download the latest release from the [GitHub Releases](https://github.com/ircfspace/teleMirror/releases) page.

## Installation

### Prerequisites

- Node.js (version 16 or higher)
- npm

### Installation Steps

1. Clone the repository:

```bash
git clone https://github.com/ircfspace/teleMirror.git
cd teleMirror
```

2. Install dependencies:

```bash
npm install
```

3. Run the application:

```bash
npm start
```

## Project Structure

```
teleMirror/
├── main.js                 # Main Electron file
├── server/
│   └── server.js          # Express backend server
├── renderer/
│   └── telegram-ui.html # User interface
├── http-client.js          # HTTP client with proxy support
├── telegram-parser.js      # Telegram content parser
├── preload.js             # Electron preload script
└── assets/                # Static files
```

## Data Sources

The application uses two sources for channel information:

### 1. Direct Telegram

- Uses Google Translate proxies
- Support for multiple methods to bypass filtering

### 2. GitHub JSON API

- URL: `https://raw.githubusercontent.com/ircfspace/teleFeed/refs/heads/export/{channelname}.json`
- Channel name must be in lowercase
- Used as backup source when Telegram is unavailable

## Technical Features

- **Proxy Support**: Multiple methods for accessing Telegram
- **Smart Caching**: 15-minute cache to reduce repeated requests
- **Format Conversion**: Automatic conversion of GitHub data to Telegram format
- **Validation**: Prevent creation of invalid channels
- **Auto Cleanup**: Remove empty and invalid channels

## Development

### Adding a New Channel

You can add channels in the following formats:

- Username: `ircfspace`
- With @: `@ircfspace`
- Telegram URL: `https://t.me/ircfspace`
- Short URL: `t.me/ircfspace`

### Channel Data Structure

```javascript
{
  username: "channel_name",
  name: "Display Name",
  loading: false,
  photo: "https://..." // optional
}
```

## Troubleshooting

### Common Issues

1. **Channel not adding**
    - Check if the channel address is correct
    - Make sure the channel hasn't been added before

2. **Messages not loading**
    - Check your internet connection
    - Wait a few minutes and try again

3. **Empty items in list**
    - Restart the application
    - Clear browser cache

## Logging

To view application logs:

- In development mode: Browser developer console
- In production mode: Electron console logs

## Contributing

To contribute to the project:

1. Create a fork
2. Apply your changes in a new branch
3. Create a Pull Request

## License

This project is licensed under the MIT License.

## Support

For bug reports or suggestions:

- Create an Issue on GitHub
- Send a message to the project's Telegram channel

## Donate

teleMirror is provided as a free and open-source application. If you find this project useful and would like to support its development, you can make a donation:

https://ircf.space/contacts.html#donate

Your support helps us maintain and improve the project for everyone.

## Credits

This project incorporates some methods and techniques inspired by ezyTel, which served as a reference for certain implementation approaches. The project also utilizes the [TeleFeed](https://github.com/ircfspace/teleFeed) repository as a backup data source for channel content.
