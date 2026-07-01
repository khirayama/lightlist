plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.services)
    alias(libs.plugins.firebase.crashlytics)
    id("com.google.android.gms.oss-licenses-plugin") apply false
}

val requestedTaskNames = gradle.startParameter.taskNames
val shouldGenerateOssLicenses =
    requestedTaskNames.any { taskName ->
        taskName == "bundle-play" ||
            taskName == "bundleRelease" ||
            taskName.endsWith(":bundleRelease")
    }

if (shouldGenerateOssLicenses) {
    apply(plugin = "com.google.android.gms.oss-licenses-plugin")
}

val generatedSharedAssetsDir = layout.buildDirectory.dir("generated/assets/shared/main").get().asFile
val syncSharedLocales by tasks.registering(Copy::class) {
    from(rootProject.file("../../shared/locales/locales.json"))
    from(rootProject.file("../../shared/licenses/manual-licenses.json"))
    into(generatedSharedAssetsDir)
}

val lightlistApplicationId =
    providers.gradleProperty("LIGHTLIST_APPLICATION_ID").orElse("com.lightlist.app").get()
val passwordResetUrl =
    providers.gradleProperty("PASSWORD_RESET_URL")
        .orElse("https://lightlist.com/password_reset")
        .get()
val versionCodeValue =
    providers.gradleProperty("LIGHTLIST_VERSION_CODE")
        .map(String::toInt)
        .orElse(1)
        .get()
val releaseKeystorePath =
    providers.gradleProperty("LIGHTLIST_ANDROID_KEYSTORE")
        .orElse(providers.environmentVariable("LIGHTLIST_ANDROID_KEYSTORE"))
        .orNull
val releaseKeystorePassword =
    providers.gradleProperty("LIGHTLIST_ANDROID_KEYSTORE_PASSWORD")
        .orElse(providers.environmentVariable("LIGHTLIST_ANDROID_KEYSTORE_PASSWORD"))
        .orNull
val releaseKeyAlias =
    providers.gradleProperty("LIGHTLIST_ANDROID_KEY_ALIAS")
        .orElse(providers.environmentVariable("LIGHTLIST_ANDROID_KEY_ALIAS"))
        .orNull
val releaseKeyPassword =
    providers.gradleProperty("LIGHTLIST_ANDROID_KEY_PASSWORD")
        .orElse(providers.environmentVariable("LIGHTLIST_ANDROID_KEY_PASSWORD"))
        .orNull
val hasReleaseSigning =
    listOf(
        releaseKeystorePath,
        releaseKeystorePassword,
        releaseKeyAlias,
        releaseKeyPassword
    ).all { !it.isNullOrBlank() }
val requireReleaseSigning =
    providers.gradleProperty("LIGHTLIST_REQUIRE_RELEASE_SIGNING")
        .map(String::toBoolean)
        .orElse(false)
        .get()

if (requireReleaseSigning && !hasReleaseSigning) {
    throw GradleException(
        "Google Play submission requires LIGHTLIST_ANDROID_KEYSTORE, LIGHTLIST_ANDROID_KEYSTORE_PASSWORD, LIGHTLIST_ANDROID_KEY_ALIAS, and LIGHTLIST_ANDROID_KEY_PASSWORD."
    )
}

android {
    namespace = "com.lightlist.app"
    compileSdk = 37

    defaultConfig {
        applicationId = lightlistApplicationId
        minSdk = 24
        targetSdk = 36
        versionCode = versionCodeValue
        versionName = "1.0"
        buildConfigField("String", "PASSWORD_RESET_URL", "\"$passwordResetUrl\"")

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        getByName("debug")
        create("release") {
            if (hasReleaseSigning) {
                storeFile = file(releaseKeystorePath!!)
                storePassword = releaseKeystorePassword
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
            }
        }
    }

    buildTypes {
        release {
            signingConfig =
                if (hasReleaseSigning) {
                    signingConfigs.getByName("release")
                } else {
                    signingConfigs.getByName("debug")
                }
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        buildConfig = true
        compose = true
    }

    sourceSets.getByName("main").assets.srcDir(generatedSharedAssetsDir.path)
}

tasks.named("preBuild").configure {
    dependsOn(syncSharedLocales)
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.foundation)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation("androidx.compose.material:material-icons-extended")
    implementation(libs.androidx.navigation.compose)
    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.auth)
    implementation(libs.firebase.firestore)
    implementation(libs.firebase.analytics)
    implementation(libs.firebase.crashlytics)
    implementation(libs.firebase.appcheck)
    releaseImplementation(libs.firebase.appcheck.playintegrity)
    debugImplementation(libs.firebase.appcheck.debug)
    implementation("com.google.android.gms:play-services-oss-licenses:17.5.1")
    implementation(libs.kotlinx.coroutines.play.services)
    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
