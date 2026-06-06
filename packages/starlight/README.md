# Moonlight

A fork of Starlight, to integrate with the Moonwave Extractor from the [Moonwave](https://github.com/evaera/moonwave) project so that it can be used to generate documentation using the Starlight documentation website instead of just Docusaurus.

Included is an example which showcases the Promise library when being used with Moonlight.

This project also includes a few extra features from [my own fork of Moonwave](https://github.com/okzyrox/moonwave), primary QOL and new additions:
- A summary at the top of the page for the objects in a Class.
- Icons next to functions, signals, types and properties
- The `@group` and `@groupdescription` tags, inspired by other docs for grouping together multiple classes.

Currently, this requires installing the extractor ahead of time using the Moonwave CLI or by providing a path to an executable of your own extractor. I recommend using the one from [my fork](https://github.com/okzyrox/moonwave) as it supports the above extra features (`@group` and `@groupdescription`)

### Known Issues
- Formatted alerts sometimes do not render correctly (probably a markdown issue)
- Properties/Functions/Types with the same name in the same class do not have distinguished links (so they all just link to 1 element.)
- There is no code highlighting of types at all
- There is no button to go to code source

# Original README

## <img src="https://github.com/withastro/starlight/assets/357379/494fcd83-42aa-4891-87e0-87402fa0b6f3" alt="" align="left" width="40" height="40"> Starlight

Starlight is a documentation website framework for [Astro][astro].

## Documentation

[Read the Starlight docs][docs] (they’re built with Starlight!)

## Support

Get help in the [Astro Discord][discord]. Post questions in our `#support` forum with the “starlight” tag, or visit our dedicated `#starlight` channel to discuss current development and more!

You can also submit bug reports and feature requests as [GitHub issues][issues].

## Contributing

Join us as a Starlight contributor! These links will help you get started:

- [Contributor Manual][contributing]
- [Code of Conduct][coc]
- [Community Guide][community]
- [Join the `#starlight` channel on Discord][discord]

## License

MIT

Copyright (c) 2023–present [Starlight contributors][contributors]

[astro]: https://astro.build/
[docs]: https://starlight.astro.build/
[contributing]: https://github.com/withastro/starlight/blob/main/CONTRIBUTING.md
[coc]: https://github.com/withastro/.github/blob/main/CODE_OF_CONDUCT.md
[community]: https://github.com/withastro/.github/blob/main/COMMUNITY_GUIDE.md
[contributors]: https://github.com/withastro/starlight/graphs/contributors
[discord]: https://astro.build/chat/
[issues]: https://github.com/withastro/starlight/issues
