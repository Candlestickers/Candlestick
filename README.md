<!-- <h1 align="center">
  <br>
  <a href="https://editor.wickeditor.com/"><img src=".github/images/logo.svg" alt="Wick Editor" width="25%"></a>
  <br>
</h1> -->

# [Candlestick](https://candlestickers.app/)

Candlestick is a fork of Wick Editor, a free and open-source tool for creating games, animations, and everything in-between.

<!-- <p align="center"><img width="100%" src=".github/images/editor.svg"></p> -->

### Getting Started

We plan to update our Node packages in the future. Until then, you will need to use Node Version 14 to install the right packages. If using an M-series Mac, this will require installing Rosetta 2.

See the original Wick Editor [README](https://github.com/Wicklets/wick-editor/blob/master/README.md) for older instructions.
Newer instructions are provided below, with a focus on Mac development. If you're a Windows user, look at [StickmanRed](https://github.com/StickmanRed)'s guide [here](https://github.com/StickmanRed/wick-editor/discussions/40). You should still read these instructions first, though.

### 1. Homebrew
This is optional as you can download things without, but Homebrew is a simple set of command line tools that make the process easier. We recommend downloading it if you haven't already. 
Quick Homebrew check—
```
brew --version
```
If nothing returns you can download it with [this command](<https://brew.sh/>)
```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Node Version Manager
<sup>(nvm = Node Version Manager)</sup>

nvm is a CLI library that helps you manage the Node versions you have installed on your device. You should be able to [install Node versions directly from online](<https://nodejs.org/en/download>).
Run a quick nvm check to see if you have it installed—
```
nvm ls
```
This command lists all the node versions you have. If you installed the node version without nvm then the command may not catch the node you have installed or it may not even be downloaded at all. 
To install nvm, you can follow the steps here:
https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating

Or just paste this command into your terminal:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```
which downloads the nvm code to an nvm directory on your system. Try running `nvm ls` or `nvm --version` afterwards, and if you get nothing from both then go back to [this link](<https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating>) and follow the instructions.

<sup>If you're on Windows, please see [nvm-windows](https://github.com/coreybutler/nvm-windows).</sup>

### 3. Installing Node
Wick Editor uses the active version of Node, 24.

Ensure you're on the correct Node version using `nvm`: 
```
nvm install 24
```

### 4. Final step, setup and run
You need to navigate to your project file... if you don't know how to navigate through the terminal then you may use [this online video tutorial](<https://www.youtube.com/watch?v=5XgBd6rjuDQ>) to learn how. It's simple but takes a minute to explain.

If you haven't downloaded our repository yet then do that by either downloading the zip, or using `git clone`
```
git clone https://github.com/Candlestickers/Candlestick.git
cd Candlestick
```
-#(You may also need to download git first using `brew install git`, or [download Git through this online website](https://git-scm.com/install/))

If you have the repository set up, then navigate to the directory and run the following command to install the npm packages:
```
npm install
```

Once you have everything setup, all you need to do to test your app is... first build the engine:
```
npm run build-engine
```
<sup>^ You'll also need to do this step every time you make changes to your `/engine` directory to be able to see changes</sup>

Then create a production build of the project:
```
npm run build
```
<sup>^ This command is not always needed while testing, you'll need it most prior to deploying your code because it's basically just an optimisation command you don't need to use much</sup>

And lastly, to run your project in development:
```
npm start
```
<sup>While working on the engine it's easier to test by running npm run engine-quickrun</sup>

If it worked, you should see something like this in the terminal.
```
VITE v8.1.5  ready in 450 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
If you go to your browser and open up [http://localhost:3000/](http://localhost:3000/) you should find the project there. You can also test on your mobile devices by going to the network `http://###.###.#.###:3000/` link on another device *connected to the same network* (it should work, but if it doesn't, it could be due to certain network restrictions).

Well that's all!
If you have any trouble with the process above, you can ask us for help on our [Discord server!](http://url.candlestickers.app/discord)

## License

Candlestick is under the GNU v3 Public License. See the [LICENSE](LICENSE.md) for more information.

## Links

* [Candlestick Announcement (The Wick Editor Forums)](https://url.candlestickers.app/updates)
* [Candlestick Community Discord](https://url.candlestickers.app/discord)

## Credits

Wick Editor was created by Luca Damasco and Zach Rispoli. See more credits on the Wick Editor [About Page](https://www.wickeditor.com/#/about/) and [Credits](https://github.com/Wicklets/wick-editor/blob/master/CREDITS.md).

Candlestick was created and is maintained by [Hamzah Alani](https://forum.wickeditor.com/u/hamzah_alani/summary), [Baron](https://forum.wickeditor.com/u/baronawc/summary), and [Jovanny Rodriguez](https://forum.wickeditor.com/u/jovanny/summary).

Active contributors:
- [StickmanRed](https://forum.wickeditor.com/u/stickmanred/summary) also found at (https://github.com/StickmanRed)

Additional, indirect contributors:
- [pumpkinhead](https://forum.wickeditor.com/u/pumpkinhead/summary) also found at [pkhead](https://github.com/pkhead)
- [SomeoneElse](https://forum.wickeditor.com/u/someoneelse/summary)

___
## Additional Terms & Conditions
<sup>These legal Terms and Conditions listed below and within our software are a legal agreement between you (either as an individual or on behalf of an entity) and our team ("Candlestickers") regarding your use of Candlestickers' applications, such as Candlestick. These terms apply to the executable code version of the Software as well. Source code for the Software is available separately and free of charge under open source software license agreements. If you do not agree to all of our listed terms below and within the software, do not download, install, use, or copy the Software.<sup>

**Disclaimers and Limitations of Liability** 

<sub> THE SOFTWARE IS PROVIDED ON AN "AS IS" BASIS, AND NO WARRANTY, EITHER EXPRESS OR IMPLIED, IS GIVEN. YOUR USE OF THE SOFTWARE IS AT YOUR SOLE RISK. Candlestickers does not warrant that (i) the Software will meet your specific requirements; (ii) the Software is fully compatible with any particular platform; (iii) your use of the Software will be uninterrupted, timely, secure, or error-free; (iv) the results that may be obtained from the use of the Software will be accurate or reliable; (v) the quality of any products, services, information, or other material purchased or obtained by you through the Software will meet your expectations; or (vi) any errors in the Software will be corrected. YOU EXPRESSLY UNDERSTAND AND AGREE THAT CANDLESTICKERS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO, DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA OR OTHER INTANGIBLE LOSSES (EVEN IF CANDLESTICKERS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES) RELATED TO THE SOFTWARE, including, for example: (i) the use or the inability to use the Software; (ii) the cost of procurement of substitute goods and Software resulting from any goods, data, information or Software purchased or obtained or messages received or transactions entered into through or from the Software; (iii) unauthorized access to or alteration of your transmissions or data; (iv) statements or conduct of any third-party on the Software; (v) or any other matter relating to the Software. Candlestickers reserves the right at any time and from time to time to modify or discontinue, temporarily or permanently, the Software (or any part thereof) with or without notice. Candlestickers shall not be liable to you or to any third-party for any price change, suspension or discontinuance of the Software. </sub>

**Miscellanea**
- <sub>No Waiver. The failure of Candlestickers to exercise or enforce any right or provision of these Application Terms shall not constitute a waiver of such right or provision.</sub>
- <sub>Entire Agreement. These Application Terms, together with any applicable Privacy Notices, constitutes the entire agreement between you and Candlestickers and governs your use of the Software, superseding any prior agreements between you and Candlestickers (including, but not limited to, any prior versions of the Application Terms).</sub>
- <sub>Governing Law. You agree that these Application Terms and your use of the Software are governed under New York law and any dispute related to the Software must be brought in a tribunal of competent jurisdiction located in or near Rochester, New York.</sub>
- <sub>Third-Party Packages. The Software supports third-party "Packages" which may modify, add, remove, or alter the functionality of the Software. These Packages are not covered by these Application Terms and may include their own license which governs your use of that particular package.</sub>
- <sub>Complete Agreement. These Application Terms, together with any applicable Open Source Licenses and Notices and Candlestickers' Privacy Statement, represent the complete and exclusive statement of the agreement between you and us. These Application Terms supersede any proposal or prior agreement oral or written, and any other communications between you and Candlestickers relating to the subject matter of these terms.</sub>
- <sub>These Application Terms are licensed under the Creative Commons Attribution license. You may use it freely under the terms of the Creative Commons license.</sub>
- <sub>Contact Us. Please send any questions about these Application Terms to team@candlestickers.app. These terms and conditions were adapted and modified from the [GitHub Open Source Applications Terms and Conditions](https://desktop.github.com/terms/)</sub>
