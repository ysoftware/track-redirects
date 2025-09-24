A node tool to track redirects of a page load.

Depends node and puppeteer, very slow, written by Claude 4.

```bash
$ node index.js "http://google.com"

Redirect chain:
- network-redirect http://google.com/ -> https://google.com/
- network-redirect https://google.com/ -> https://www.google.com/
  Cookie: AEC=AaJma5uVEgeohu_54Q-Fy0BIAYualqgOfjsfv0j6VecROkm8u8M9HfRobQ
- frame-nav https://www.google.com/
  Cookie: AEC=AaJma5uVEgeohu_54Q-Fy0BIAYualqgOfjsfv0j6VecROkm8u8M9HfRobQ
- frame-nav https://www.google.com/
  Cookie: AEC=AaJma5uVEgeohu_54Q-Fy0BIAYualqgOfjsfv0j6VecROkm8u8M9HfRobQ
- initial https://www.google.com/
  Cookie: AEC=AaJma5uVEgeohu_54Q-Fy0BIAYualqgOfjsfv0j6VecROkm8u8M9HfRobQ
```
