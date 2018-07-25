# usb-main
A nodejs-based tool that can automatically update and burn linux install disks.

## Installation

You can easily install this by running `npm install usb-main -g`

## Available Distros 
Currently, there aren't many distos available, but pull requests to add distros are welcome.
- Manjaro i3 Community Edition
- Solus Budgie
- Ubuntu Desktop

## Usage

`usb-main --help` will return a list of commands: 
```
  Usage: usb-main [options] [command]

  Options:

    -V, --version                       output the version number
    -h, --help                          output usage information

  Commands:

    burn [options] <short> <interface>  Burn a distro to a specific partition
    sync [options]                      Sync all local copies of isos
    list                                List all configured distros
    update [options]                    Update and burn all configured distros to the configured partitions

```

## Configuration

All Configuration is done in `~/.config/usb-main/config.json`. Here's an example file:
```
{
		"partitions":{
			"manjaro":"/dev/sde"
		},
		"enabled":["manjaro"]
}
```

Partitions defines what partitions distros get burnt to when running `update`. Please be **extremely** careful when using this option, as misusing it could wipe a drive you didn't want it to. Enabled is an array of distro names that controls which distros get synced and burnt.
