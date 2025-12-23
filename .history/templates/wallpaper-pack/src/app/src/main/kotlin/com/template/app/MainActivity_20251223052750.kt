package {{PACKAGE_NAME}}

import android.app.WallpaperManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import {{PACKAGE_NAME}}.ui.theme.WallpaperPackTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WallpaperPackTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    WallpaperGallery()
                }
            }
        }
    }
}

@Composable
fun WallpaperGallery() {
    val context = LocalContext.current
    var selectedWallpaper by remember { mutableStateOf<Int?>(null) }
    
    // List of wallpaper resources (will be populated during build)
    val wallpapers = remember {
        listOf(
            R.drawable.wallpaper_1,
            R.drawable.wallpaper_2,
            R.drawable.wallpaper_3,
            R.drawable.wallpaper_4,
            R.drawable.wallpaper_5,
        )
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(
            title = { Text(stringResource(R.string.app_name)) },
            colors = TopAppBarDefaults.topAppBarColors(
                containerColor = MaterialTheme.colorScheme.primary,
                titleContentColor = MaterialTheme.colorScheme.onPrimary
            )
        )
        
        LazyVerticalGrid(
            columns = GridCells.Fixed(2),
            contentPadding = PaddingValues(8.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(wallpapers) { wallpaperId ->
                WallpaperCard(
                    wallpaperId = wallpaperId,
                    isSelected = selectedWallpaper == wallpaperId,
                    onClick = { selectedWallpaper = wallpaperId }
                )
            }
        }
        
        if (selectedWallpaper != null) {
            Button(
                onClick = {
                    setWallpaper(context, selectedWallpaper!!)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Text(stringResource(R.string.set_wallpaper))
            }
        }
    }
}

@Composable
fun WallpaperCard(
    wallpaperId: Int,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .padding(4.dp)
            .aspectRatio(9f / 16f)
            .clickable(onClick = onClick),
        border = if (isSelected) {
            CardDefaults.outlinedCardBorder()
        } else null
    ) {
        AsyncImage(
            model = wallpaperId,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )
    }
}

private fun setWallpaper(context: android.content.Context, resourceId: Int) {
    try {
        val wallpaperManager = WallpaperManager.getInstance(context)
        wallpaperManager.setResource(resourceId)
        Toast.makeText(
            context,
            context.getString(R.string.wallpaper_set_success),
            Toast.LENGTH_SHORT
        ).show()
    } catch (e: Exception) {
        Toast.makeText(
            context,
            context.getString(R.string.wallpaper_set_error),
            Toast.LENGTH_SHORT
        ).show()
    }
}
