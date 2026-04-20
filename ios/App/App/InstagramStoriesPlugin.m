#import <Capacitor/Capacitor.h>

CAP_PLUGIN(InstagramStoriesPlugin, "InstagramStories",
    CAP_PLUGIN_METHOD(shareToStory, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(canShareToInstagram, CAPPluginReturnPromise);
)
