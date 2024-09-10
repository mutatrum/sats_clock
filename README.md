# sats_clock


# Installation

Flash the SD card with [https://www.raspberrypi.org/software/operating-systems/#raspberry-pi-os-32-bit](Raspberry Pi OS Lite (32-bit)).

When flashed, mount the boot partition.

```bash
touch ssh```

Enable ssh and wifi.

See https://www.raspberrypi.org/documentation/configuration/wireless/headless.md

wpa_supplicant.conf file example:

```
ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
country=<Insert 2 letter ISO 3166-1 country code here>
update_config=1

network={
 ssid="<Name of your wireless LAN>"
 psk="<Password for your wireless LAN>"
}
```

# First login

```bash
ssh pi@raspberrypi
sudo raspi-config```

Update

Advanced Options -> Expand Filesystem

Reboot

```bash
sudo apt-get update
sudo apt-get full-upgrade
sudo apt autoremove```

Install display driver

[https://github.com/pimoroni/hyperpixel4/tree/square](Pimoroni GitHub repository)

```bash
sudo apt-get install git
git clone https://github.com/pimoroni/hyperpixel4 -b square
cd hyperpixel4
sudo ./install.sh```

reboot

```bash
sudo reboot now```

Display should now show boot stuff.

Disable tty1 output

```bash
sudo nano /boot/cmdline.txt```

append: ` vt.global_cursor_default=0`

Install node.js

```bash
wget https://nodejs.org/dist/latest-v11.x/node-v11.15.0-linux-armv6l.tar.gz
tar xzf node-v11.15.0-linux-armv6l.tar.gz
sudo cp -r * /usr/local```

Test
```bash
node -v```
v11.15.0

# Install sats_clock

```bash
git clone https://github.com/mutatrum/sats_clock.git
cd sats_clock
npm install
npm audit fix```

# Install service

```bash
nano /etc/systemd/system/sats_clock.service```

```
[Unit]
Description=Sats Clock
After=network-online.target
Wants=network-online.target

[Service]
WorkingDirectory=/home/pi/sats_clock
ExecStart=/usr/local/bin/node index.js
User=pi
Restart=always
TimeoutSec=120
RestartSec=30

[Install]
WantedBy=multi-user.target
```

Reboot

# Font generation

https://ttf2fnt.com/