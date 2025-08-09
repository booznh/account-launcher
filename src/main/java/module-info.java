module com.example.ghostlitelauncher {
    requires javafx.controls;
    requires javafx.fxml;


    opens com.example.ghostlitelauncher to javafx.fxml;
    exports com.example.ghostlitelauncher;
}